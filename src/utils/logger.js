import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function write(file, level, data) {
  const line =
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      ...data
    }) + "\n";

  fs.appendFile(path.join(LOG_DIR, file), line, (err) => {
    if (err) {
      console.error("Logger Error:", err);
    }
  });
}

export const log = (data) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(data);
  }

  write("app.log", "INFO", data);
};

export const error = (data) => {
  console.error(data);

  write("error.log", "ERROR", data);
};

export const auth = (data) => {
  write("auth.log", "AUTH", data);
};

export const tenant = (data) => {
  write("tenant.log", "TENANT", data);
};
