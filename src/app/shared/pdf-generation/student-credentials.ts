const pdfMake = require('pdfmake/build/pdfmake.js');
const pdfFonts = require('pdfmake/build/vfs_fonts.js');
import { Alignment, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
(<any>pdfMake).vfs = pdfFonts.vfs;

export function studentListExportPdf(
    classroomStemClubInfo: any,
    base64Image: Array<any>,
    studentDetails: Array<any>,
    platformUrl: string
) {
    const { institutionName, type } = classroomStemClubInfo?.selectedClassroomStemClub;
    // console.log('classroomStemClubInfo', classroomStemClubInfo);
    // console.log('base64Image', base64Image);
    // console.log('studentDetails', studentDetails);
    // console.log('platformUrl', platformUrl);
    // console.log('institutionName', institutionName);
    // console.log('type', type);
    // console.log(classroomStemClubInfo?.selectedClassroomStemClub);
    const classroomStemClubName =
        type === 'CLASSROOM'
            ? classroomStemClubInfo?.selectedClassroomStemClub?.classroomName
            : type === 'STEM-CLUB'
                ? classroomStemClubInfo?.selectedClassroomStemClub?.stemClubName
                : undefined;
    const { numberOfStudents } = classroomStemClubInfo;

    // Reverse even and odd logic for display order
    const evenStudents = studentDetails.filter((_, index) => index % 2 !== 0);
    const oddStudents = studentDetails.filter((_, index) => index % 2 === 0);

    // Function to split student data into pages (14 students per page)
    const chunkArray = (arr: any[], size: number) => {
        const chunkedArr = [];
        for (let i = 0; i < arr.length; i += size) {
            chunkedArr.push(arr.slice(i, i + size));
        }
        return chunkedArr;
    };

    const pages = chunkArray(studentDetails, 14); // 7 rows (14 students) per page
    const content = [];

    // Add header (logo + title)
    content.push(
        {
            columns: base64Image.map(image => ({
                svg: image as string,
                fit: [100, 100] as [number, number],
                alignment: 'right' as Alignment,
            })),
            columnGap: -300 as number,
        },
        {
            text: ' ',
            lineHeight: 2,
        },
        {
            text: 'Student Credentials',
            style: 'header',
        },
        {
            text: `${institutionName}`,
            style: 'subheader',
            lineHeight: 2,
        }
    );

    // Loop through each page and create paginated tables
    pages.forEach((pageData, pageIndex) => {
        const pageEvenStudents = pageData.filter((_, i) => i % 2 !== 0);
        const pageOddStudents = pageData.filter((_, i) => i % 2 === 0);

        let totalRows = 7; // Default rows per page
        if (pageIndex === pages.length - 1 && pageData.length < 14) {
            totalRows = Math.ceil(pageData.length / 2); // Adjust rows for the last page
        }

        const pairedStudents: TableCell[][] = [];
        for (let i = 0; i < totalRows; i++) {
            const oddStudent = pageOddStudents[i];
            const evenStudent = pageEvenStudents[i];

            const oddFormatted = oddStudent ? formatTable(oddStudent, type, classroomStemClubName, platformUrl) : { text: '' };
            const evenFormatted = evenStudent ? formatTable(evenStudent, type, classroomStemClubName, platformUrl) : { text: '' };

            pairedStudents.push([oddFormatted, evenFormatted]);
        }

        // Table border styles - Hide bottom border on all rows except the last on first page.
        const tableLayout = {
            hLineWidth: (i: number, node: any) => 1,
            vLineWidth: (i: number, node: any) => 1,
            hLineColor: (i: number, node: any) => 'black',
            vLineColor: (i: number, node: any) => 'black',
            // ... (other layout properties if needed)
            hLineStyle: (i: number, node: any) => null, // Solid line
            vLineStyle: (i: number, node: any) => null, // Solid line
        };

        if (pageIndex > 0) {
            tableLayout.hLineStyle = (i: number, node: any) => (i === totalRows ? null : null); // All solid lines
        }

        // Add table for current page with proper page breaks
        content.push({
            table: {
                widths: ['50%', '50%'],
                body: pairedStudents,
            },
            layout: tableLayout,
            margin: [0, 10, 0, 10],
            pageBreak: pageIndex > 0 ? 'before' : undefined, // Dynamic page breaks
        });
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


// Formatting function for student data
function formatTable(studentDetails: any, roomType: string, classroomStemClubName: string, url: string): any {
    const accessCode = studentDetails?.accessCode || '';
    const password = studentDetails?.password || '';
    const number = studentDetails?.number ?? '';

    const institutionId = accessCode.slice(0, 7) || 'N/A';
    const studentId = accessCode.slice(7, 13) || 'N/A';

    const formattedType = roomType
        .toLowerCase()
        .replace(/-/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return {
        text: `${formattedType}: ${classroomStemClubName}\nRoll Number ${number}\nInstitution ID: ${institutionId}\nStudent ID: ${studentId}\nPassword: ${password}\nURL: ${url}`,
    };
}