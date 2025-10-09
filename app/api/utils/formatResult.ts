import { isNormal } from "@/app/api/utils/normalRanges";

export function formatResult(name: string, value: string | number): string {
  if (!value) return "";

  const normal = isNormal(name, Number(value));
  let re;
  if (normal === false) {
    re =  `<b>${value}</b>`;
  } else {
    re = String(value);
  }

  console.log("name:", name, "value:", value, "normal:", normal, "re:", re);
  
  return re
}
