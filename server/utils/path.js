/**
 * Windows 路径转 WSL 路径
 * C:\Users\lijie\projects\demo -> /mnt/c/Users/lijie/projects/demo
 */
export function toWSLPath(winPath) {
  if (!winPath) return '';
  
  return winPath
    .replace(/^([A-Z]):\\/, (_, drive) => `/mnt/${drive.toLowerCase()}/`)
    .replace(/\\/g, '/');
}

/**
 * WSL 路径转 Windows 路径
 * /mnt/c/Users/lijie/projects/demo -> C:\Users\lijie\projects\demo
 */
export function toWindowsPath(wslPath) {
  if (!wslPath) return '';
  
  return wslPath
    .replace(/^\/mnt\/([a-z])\//, (_, drive) => `${drive.toUpperCase()}:\\`)
    .replace(/\//g, '\\');
}

/**
 * 规范化路径（移除末尾的斜杠）
 */
export function normalizePath(path) {
  return path.replace(/[\\\/]+$/, '');
}
