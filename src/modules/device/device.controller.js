import prisma from "../../lib/prisma.js";
import CryptoJS from "crypto-js";

//////////////////////////////////////
// 🔐 CONFIG ENCRYPT
//////////////////////////////////////
const SECRET = process.env.DEVICE_SECRET || "secret_dev";

const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, SECRET).toString();
};

//////////////////////////////////////
// 🧠 VALIDACIÓN
//////////////////////////////////////
const validateDevice = (data) => {
  const { name, ip, deviceType, brand, branchId } = data;

  if (!name) return "El nombre es obligatorio";
  if (!ip) return "La IP es obligatoria";
  if (!deviceType) return "deviceType es obligatorio";
  if (!brand) return "brand es obligatorio";
  if (!branchId) return "branchId es obligatorio";

  return null;
};

//////////////////////////////////////
// CREATE
//////////////////////////////////////
export const createDevice = async (req, res) => {
  try {
    const error = validateDevice(req.body);
    if (error) return res.status(400).json({ message: error });

    const companyId = req.user.companyId;

    const {
      name,
      ip,
      port,
      username,
      password,
      deviceType,
      brand,
      branchId
    } = req.body;

    // 🔒 validar sucursal
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId
      }
    });

    if (!branch) {
      return res.status(404).json({ message: "Sucursal no válida" });
    }

    const device = await prisma.device.create({
      data: {
        name,
        ip,
        port,
        username,
        password: password ? encrypt(password) : null,
        deviceType,
        brand,
        companyId,
        branchId
      }
    });

    res.status(201).json(device);
  } catch (error) {
    

    if (error.code === "P2002") {
      return res.status(400).json({
        message: "Ya existe un dispositivo con esa IP en esta sucursal"
      });
    }

    res.status(500).json({ message: "Error creando device" });
  }
};

//////////////////////////////////////
// GET ALL
//////////////////////////////////////
export const getDevices = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { branchId } = req.query;

    const devices = await prisma.device.findMany({
      where: {
        companyId,
        isActive: true,
        ...(branchId && { branchId })
      },
      include: {
        branch: true
        // commands: {
        //   where: {
        //     status: "PROCESSING"
        //   }
        // }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // 🔥 LÓGICA DE ESTADO (AQUÍ MISMO)
    const HEARTBEAT_TIMEOUT = 45000; // 45s
    const now = new Date();

    const mapped = devices.map(d => {
      const diff = d.lastSeenAt ? now - new Date(d.lastSeenAt) : Infinity;
      const isAlive = diff < HEARTBEAT_TIMEOUT;

      let status = "OFFLINE";

      if (isAlive) {
        status = "ONLINE";

        // 🟠 si está ejecutando algo
        if (d.commands.length > 0) {
          status = "BUSY";
        }

        // 🔴 si agent dice desconectado
        if (d.status === "DISCONNECTED") {
          status = "OFFLINE";
        }
      }

      return {
        ...d,
        status
      };
    });

    res.json(mapped);

  } catch (error) {
    
    res.status(500).json({ message: "Error obteniendo devices" });
  }
};
//////////////////////////////////////
// GET BY ID
//////////////////////////////////////
export const getDeviceById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const device = await prisma.device.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        branch: true
      }
    });

    if (!device) {
      return res.status(404).json({ message: "Device no encontrado" });
    }

    res.json(device);
  } catch (error) {
    
    res.status(500).json({ message: "Error obteniendo device" });
  }
};

//////////////////////////////////////
// UPDATE
//////////////////////////////////////
export const updateDevice = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const deviceExists = await prisma.device.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!deviceExists) {
      return res.status(404).json({ message: "Device no encontrado" });
    }

    const {
      name,
      ip,
      port,
      username,
      password,
      deviceType,
      brand,
      branchId
    } = req.body;

    // 🔒 validar sucursal si viene
    if (branchId) {
      const branch = await prisma.branch.findFirst({
        where: {
          id: branchId,
          companyId
        }
      });

      if (!branch) {
        return res.status(404).json({ message: "Sucursal no válida" });
      }
    }

    const updated = await prisma.device.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(ip && { ip }),
        ...(port !== undefined && { port }),
        ...(username && { username }),
        ...(password && { password: encrypt(password) }),
        ...(deviceType && { deviceType }),
        ...(brand && { brand }),
        ...(branchId && { branchId })
      }
    });

    res.json(updated);
  } catch (error) {
    

    if (error.code === "P2002") {
      return res.status(400).json({
        message: "Ya existe un dispositivo con esa IP en esta sucursal"
      });
    }

    res.status(500).json({ message: "Error actualizando device" });
  }
};

//////////////////////////////////////
// DELETE (SOFT DELETE)
//////////////////////////////////////
export const deleteDevice = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const device = await prisma.device.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!device) {
      return res.status(404).json({ message: "Device no encontrado" });
    }

    await prisma.device.update({
      where: { id },
      data: {
        isActive: false
      }
    });

    res.json({ message: "Device eliminado correctamente" });
  } catch (error) {
    
    res.status(500).json({ message: "Error eliminando device" });
  }
};