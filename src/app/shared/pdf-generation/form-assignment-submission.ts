const pdfMake = require('pdfmake/build/pdfmake.js');
const pdfFonts = require('pdfmake/build/vfs_fonts.js');
import { Alignment, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
(<any>pdfMake).vfs = pdfFonts.vfs;

export function formAssignmentSubmissionPdf(
    submissionData: any,
) {
    const { contestStepName, submission } = submissionData;

    const { questions } = submission;

    const content = [];

    // Add header
    content.push(
        {
            text: ' ',
            lineHeight: 2,
        },
        {
            text: `${contestStepName} Submission`,
            style: 'header',
        },
        {
            text: ' ',
            lineHeight: 2,
        },
    );

    const olArray = questions.map((questionObj: any) => {
        const { question, answer } = questionObj;
        return {
            text: [
                `${question}\n\n`,
                { text: `Answer`, bold: true },
                `: ${answer}\n\n\n`,
            ]
        };
    });

    // Add body
    content.push({
        ol: olArray
    });

    // Define PDF document
    const docDefinition: TDocumentDefinitions = {
        content,
        styles: {
            header: {
                fontSize: 18,
                bold: true,
                alignment: 'center' as Alignment,
            },
            subheader: {
                fontSize: 15,
                bold: true,
                alignment: 'center' as Alignment,
            },
            quote: {
                italics: true,
            },
            small: {
                fontSize: 8,
            },
        },
        pageOrientation: 'portrait',
    };

    return pdfMake.createPdf(docDefinition);
}