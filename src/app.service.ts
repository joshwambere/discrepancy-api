import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  async discrepancyGeneric(files: Array<Express.Multer.File>) {
    let vendorProductFile;
    let productFile;
    for (const file of files) {
      if (file.fieldname === 'vendor') vendorProductFile = file;
      if (file.fieldname === 'json') productFile = file;
    }

    if (!vendorProductFile || !productFile) {
      throw new Error('CSV and JSON files are required');
    }

    const vendorProductJson = vendorProductFile.buffer.toString();
    const productJson = productFile.buffer.toString();

    const vendorProducts = this.parseVendorJson(vendorProductJson);
    const products = this.parseJSON(productJson);

    return await this.getGenericTotalDiscrepancy(vendorProducts, products);
  }
  async compareFiles(files: Array<Express.Multer.File>) {
    const csvFile = files.find((file) => file.mimetype === 'text/csv');
    const jsonFile = files.find((file) => file.mimetype === 'application/json');
    if (!csvFile || !jsonFile)
      throw new Error('CSV and JSON files are required');

    const csv = csvFile.buffer.toString();
    const json = jsonFile.buffer.toString();

    const parsedCSV = await this.parseCSV(csv);
    const parsedJSON = this.parseJSON(json);

    return await this.getTotalDiscrepancy(parsedCSV.items, parsedJSON);
  }

  async parseCSV(csv: string): Promise<{ items: VendorProduct[] }> {
    const lines = csv.split('\n');
    const headers = lines[0].split(';'); // Assuming the CSV uses semicolons as separators
    const items: VendorProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';'); // Assuming the CSV uses semicolons as separators

      if (values.length === headers.length) {
        const vendorProduct: VendorProduct = {} as VendorProduct;

        headers.forEach((header, index) => {
          vendorProduct[header] =
            values[index] || (header.includes('Price') ? '0' : ''); // Set default values
        });

        items.push(vendorProduct);
      }
    }

    return { items };
  }

  parseJSON(jsonData: string): Product[] {
    const data = JSON.parse(jsonData);
    if (data.items) {
      return data.items;
    }
    return [];
  }

  parseVendorJson(jsonData: string): GPIProduct[] {
    const data = JSON.parse(jsonData);
    if (data) {
      return data;
    }
    return [];
  }

  async getTotalDiscrepancy(
    data: VendorProduct[],
    jsonData: Product[],
  ): Promise<{ differences: number; totalMatches: number }> {
    let totalPriceDifference = 0;
    let totalMatches = 0;
    data.forEach((csvData) => {
      const matchingJsonData = jsonData.find(
        (json) => json.Artikel__c === csvData.SKU,
      );

      if (matchingJsonData) {
        totalMatches++;
        const csvPrice = parseFloat(
          csvData['Recommended sales price'].toString().replace(',', '.'),
        );
        const jsonPrice = matchingJsonData.Prijs_incl_heffingen__c;

        if (jsonPrice !== csvPrice) totalPriceDifference++;
      }
    });
    const differences = (totalPriceDifference / totalMatches) * 100;
    return { differences, totalMatches };
  }

  async getGenericTotalDiscrepancy(
    data: GPIProduct[],
    jsonData: Product[],
  ): Promise<{ differences: number; totalMatches: number }> {
    let totalPriceDifference = 0;
    let totalMatches = 0;
    data.forEach((csvData) => {
      const matchingJsonData = jsonData.find(
        (json) => json.Artikel__c === csvData.Artikel__c,
      );

      if (matchingJsonData) {
        totalMatches++;
        const jsonPrice = matchingJsonData.Prijs_incl_heffingen__c;
        const csvPrice = csvData.Prijs_incl_heffingen__c;

        if (jsonPrice !== csvPrice) totalPriceDifference++;
      }
    });
    const differences = (totalPriceDifference / totalMatches) * 100;
    return { differences, totalMatches };
  }
}
