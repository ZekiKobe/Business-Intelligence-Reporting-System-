declare module "json2csv" {
  export class Parser {
    constructor(opts?: any);
    parse(data: any): string;
  }
}

declare module "jspdf" {
  const jsPDF: any;
  export default jsPDF;
}

declare module "js2xmlparser";

declare module "jspdf-autotable" {
  const autoTable: any;
  export default autoTable;
}

declare module "jspdf" {
  const jsPDF: any;
  export default jsPDF;
}
