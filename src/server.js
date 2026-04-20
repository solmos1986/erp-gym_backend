import app from "./app.js";

const PORT = 3000;

app.listen(PORT, '0.0.0.0',() => {
  console.log('Backend está corriendo en http://0.0.0.0:3000');
});