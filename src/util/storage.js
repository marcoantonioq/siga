import fs from "fs";

export const restore = (path) => {
  return fs.existsSync(path)
    ? JSON.parse(fs.readFileSync(path, "utf-8"))
    : null;
};

export const save = (path, data) => {
  fs.writeFileSync(path, data, "utf-8");
};

export default {
  restore,
  save,
};
