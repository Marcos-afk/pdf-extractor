export interface PDFDataResponseProps {
	customerNumber: string;
	referenceMonth: string;
	electricalEnergyQuantity: number;
	electricalEnergyValue: number;
	sceeeEnergyWithoutICMSQuantity: number;
	sceeeEnergyWithoutICMSValue: number;
	gdiCompensatedEnergyQuantity: number;
	gdiCompensatedEnergyValue: number;
	contribMunicipalPublicLightValue: number;
}

export interface PDFDataProps {
	pdf: Express.Multer.File;
}

export abstract class PDFDataExtractorProvider {
	abstract get(data: PDFDataProps): Promise<PDFDataResponseProps>;
}
