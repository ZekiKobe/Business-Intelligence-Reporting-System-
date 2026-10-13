import { jsPDF } from "jspdf";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

declare module "jspdf-autotable" {
  export function applyPlugin(jsPDF: any): void;
  export function autoTable(doc: any, options: any): void;
  const autoTableDefault: (doc: any, options: any) => void;
  export default autoTableDefault;
}
