export function calculateMasterClassroomsFireDocSize(collectionName: string, data: any) {
    // Handle null or undefined data
    if (!data) {
        return collectionName.length + 1 + 16 + 1 + 32; // Basic empty document size
    }

    try {
        const document = JSON.parse(JSON.stringify(data));
        let sizeOfNullKey: number;
        let sizeOfKeys: number;
        let sizeOfFields: number;
        
        if(!Object.keys(document).length) {
            sizeOfNullKey = 1;
            sizeOfKeys = 0;
            sizeOfFields = 0;
        } else {
            sizeOfNullKey = 0;
            sizeOfKeys = Object.keys(document).map(x => x.length + 1).reduce((a, b) => a+b);
            sizeOfFields = Object.values(document).map((x: any) => {
                if (x === null || x === undefined) {
                    return 1; // Null field size
                }

                const typeOfField = (/^\[\w+\s(.*)\]$/g).exec(Object.prototype.toString.call(x))?.[1]?.toLowerCase();
                
                switch (typeOfField) {
                    case 'string':
                        return x.length + 1;

                    case 'number':
                        return 8;

                    case 'boolean':
                        return 1;

                    case 'array':
                        if (!Array.isArray(x) || x.length === 0) {
                            return 0;
                        }
                        return x.map((item) => {
                            if (item === null || item === undefined) {
                                return 1;
                            }
                            
                            let sizeOfSub1NullKeys: number;
                            let sizeOfSub1Keys: number;
                            let sizeOfSub1Values: number;
                            
                            if(typeof item !== 'object' || !Object.keys(item).length) {
                                sizeOfSub1NullKeys = 1;
                                sizeOfSub1Keys = 0;
                                sizeOfSub1Values = 0;
                            } else {
                                sizeOfSub1NullKeys = 0;
                                sizeOfSub1Keys = Object.keys(item).map(x => x.length + 1).reduce((a,b) => a+b);
                                sizeOfSub1Values = Object.values(item).map((x: any) => {
                                    if (x === null || x === undefined) {
                                        return 1;
                                    }
                                    
                                    const typeOfSub1Fields = (/^\[\w+\s(.*)\]$/g).exec(Object.prototype.toString.call(x))?.[1]?.toLowerCase();
                                    
                                    switch (typeOfSub1Fields) {
                                        case 'string':
                                            return x.length + 1;

                                        case 'number':
                                            return 8;

                                        case 'boolean':
                                            return 1;

                                        case 'object':
                                            if(x && x.hasOwnProperty('seconds')) {
                                                return 8; // Timestamp
                                            } else if (x && typeof x === 'object') {
                                                // Handle nested objects
                                                let sizeOfSub2NullKeys: number;
                                                let sizeOfSub2Keys: number;
                                                let sizeOfSub2Values: number;
                                                
                                                if(!Object.keys(x).length) {
                                                    sizeOfSub2NullKeys = 1;
                                                    sizeOfSub2Keys = 0;
                                                    sizeOfSub2Values = 0;
                                                } else {
                                                    sizeOfSub2NullKeys = 0;
                                                    sizeOfSub2Keys = Object.keys(x).map(x => x.length + 1).reduce((a, b) => a+b);
                                                    sizeOfSub2Values = Object.values(x).map((x: any) => {
                                                        if (x === null || x === undefined) {
                                                            return 1;
                                                        }
                                                        
                                                        const typeOfSub3Fields = (/^\[\w+\s(.*)\]$/g).exec(Object.prototype.toString.call(x))?.[1]?.toLowerCase();
                                                        
                                                        switch (typeOfSub3Fields) {
                                                            case 'string':
                                                                return x.length + 1;
                                                            case 'number':
                                                                return 8;
                                                            case 'boolean':
                                                                return 1;
                                                            case 'array':
                                                                if (!Array.isArray(x) || x.length === 0) {
                                                                    return 0;
                                                                }
                                                                return x.map((i) => {
                                                                    if (i === null || i === undefined) {
                                                                        return 1;
                                                                    }
                                                                    if (typeof i !== 'object') {
                                                                        return String(i).length + 1;
                                                                    }
                                                                    
                                                                    let sizeOfSub4NullKeys: number;
                                                                    let sizeOfSub4Keys: number;
                                                                    let sizeOfSub4Values: number;
                                                                    
                                                                    if(!Object.keys(i).length) {
                                                                        sizeOfSub4NullKeys = 1;
                                                                        sizeOfSub4Keys = 0;
                                                                        sizeOfSub4Values = 0;
                                                                    } else {
                                                                        sizeOfSub4NullKeys = 0;
                                                                        sizeOfSub4Keys = Object.keys(i).map(x => x.length + 1).reduce((a, b) => a+b);
                                                                        sizeOfSub4Values = Object.values(i).map((x: any) => {
                                                                            if (x === null || x === undefined) {
                                                                                return 1;
                                                                            }
                                                                            const typeOfSub4Fields = (/^\[\w+\s(.*)\]$/g).exec(Object.prototype.toString.call(x))?.[1]?.toLowerCase();
                                                                            
                                                                            switch (typeOfSub4Fields) {
                                                                                case 'string':
                                                                                    return x.length + 1;
                                                                                case 'number':
                                                                                    return 8;
                                                                                case 'boolean':
                                                                                    return 1;
                                                                                default:
                                                                                    return 0;
                                                                            }
                                                                        }).reduce((a, b) => a+b, 0);
                                                                    }
                                                                    return sizeOfSub4NullKeys + sizeOfSub4Keys + sizeOfSub4Values + 32;
                                                                }).reduce((a, b) => a+b, 0);
                                                            default:
                                                                return 0;
                                                        }
                                                    }).reduce((a, b) => a+b, 0);
                                                }
                                                return sizeOfSub2NullKeys + sizeOfSub2Keys + sizeOfSub2Values + 32;
                                            }
                                            return 0;

                                        case 'array':
                                            if (!Array.isArray(x) || x.length === 0) {
                                                return 0;
                                            }
                                            return x.length * 8; // Simplified array calculation

                                        default:
                                            return 0;
                                    }
                                }).reduce((a, b) => a+b, 0);
                            }
                            return sizeOfSub1NullKeys + sizeOfSub1Keys + sizeOfSub1Values + 32;
                        }).reduce((a, b) => a+b, 0);

                    case 'object':
                        if(x && x.hasOwnProperty('seconds')) {
                            return 8; // Timestamp
                        } else if (x && typeof x === 'object') {
                            // Handle nested objects
                            let objectSize = 0;
                            if (Object.keys(x).length > 0) {
                                objectSize += Object.keys(x).map(k => k.length + 1).reduce((a, b) => a+b, 0);
                                objectSize += Object.values(x).map((val: any) => {
                                    if (val === null || val === undefined) return 1;
                                    if (typeof val === 'string') return val.length + 1;
                                    if (typeof val === 'number') return 8;
                                    if (typeof val === 'boolean') return 1;
                                    return 8; // Default for complex types
                                }).reduce((a, b) => a+b, 0);
                            }
                            return objectSize + 32;
                        }
                        return 0;

                    default:
                        return 0;
                }
            }).reduce((a, b) => a+b, 0);
        }
        
        const totalSize = collectionName.length + 1 + 16 + sizeOfNullKey + sizeOfKeys + sizeOfFields + 32;
        return totalSize;
        
    } catch (error) {
        console.error('Error calculating document size:', error);
        return collectionName.length + 1 + 16 + 1 + 32; // Return minimum size on error
    }
};

/**
 * Analyzes Firestore document size and provides detailed usage information
 * @param collectionName - Name of the Firestore collection
 * @param documentData - The document data to analyze
 * @param logToConsole - Whether to log results to console (default: true)
 * @returns Object containing size analysis results
 */
export function analyzeFirestoreDocumentSize(collectionName: string, documentData: any, logToConsole: boolean = true) {
    const firebaseLimit = 1048576; // 1MB in bytes
    
    // Calculate document size
    const documentSize = calculateMasterClassroomsFireDocSize(collectionName, documentData);
    
    // Convert to readable formats
    const sizeInKB = (documentSize / 1024).toFixed(2);
    const sizeInMB = (documentSize / (1024 * 1024)).toFixed(4);
    
    // Calculate usage percentage
    const percentageUsed = ((documentSize / firebaseLimit) * 100).toFixed(2);
    const remainingBytes = firebaseLimit - documentSize;
    
    // Determine status
    const isApproachingLimit = documentSize > firebaseLimit * 0.8; // 80% threshold
    const isOverLimit = documentSize > firebaseLimit;
    
    const result = {
        documentSize,
        sizeInKB: parseFloat(sizeInKB),
        sizeInMB: parseFloat(sizeInMB),
        percentageUsed: parseFloat(percentageUsed),
        remainingBytes,
        firebaseLimit,
        isApproachingLimit,
        isOverLimit,
        status: isOverLimit ? 'OVER_LIMIT' : isApproachingLimit ? 'APPROACHING_LIMIT' : 'SAFE'
    };
    
    if (logToConsole) {
        if (documentData) {
            console.log('📄 Document exists. Size:', documentSize, 'bytes');
            console.log('📊 Document data:', documentData);
        } else {
            console.log('📄 Document is null/undefined. Calculated empty document size:', documentSize, 'bytes');
        }
        
        console.log(`📏 Document size: ${documentSize} bytes (${sizeInKB} KB, ${sizeInMB} MB)`);
        console.log(`📈 Firebase limit usage: ${percentageUsed}% (${remainingBytes} bytes remaining)`);
        
        if (isOverLimit) {
            console.error('🚨 Document size EXCEEDS Firebase 1MB limit!');
        } else if (isApproachingLimit) {
            console.warn('⚠️  Document size is approaching Firebase 1MB limit!');
        } else {
            console.log('✅ Document size is within safe limits');
        }
        
        // Additional insights
        const maxDocuments = Math.floor(firebaseLimit / documentSize);
        console.log(`💡 At this size, you could store ~${maxDocuments} similar documents before hitting the limit`);
    }
    
    return result;
}

export function calculateMasterInstitutionsFireDocSize(collectionName: string, data: any) {
    const document = JSON.parse(JSON.stringify(data));
    let sizeOfNullKey: number;
    let sizeOfKeys: number;
    let sizeOfFields: number;
    if(!Object.keys(document).length) {
        sizeOfNullKey = 1;
        sizeOfKeys = 0;
        sizeOfFields = 0;
    } else {
        sizeOfNullKey = 0;
        sizeOfKeys = Object.keys(document).map(x => x.length + 1).reduce((a, b) => a+b);
        sizeOfFields = Object.values(document).map((x: any) => {
            const typeOfField = (/^\[\w+\s(.*)\]$/g).exec(Object.prototype.toString.call(x))[1].toLowerCase();
            // console.log(typeOfField);
            switch (typeOfField) {
                case 'string':
                    return x.length + 1;

                case 'object':
                    if(x.hasOwnProperty('seconds')) {
                        return 0 + 8;
                    }
                    break;

                case 'array':
                    return (
                        x.map((x) => {
                            let sizeOfSub1NullKeys: number;
                            let sizeOfSub1Keys: number;
                            let sizeOfSub1Values: number;
                            if(!Object.keys(x).length) {
                                sizeOfSub1NullKeys = 1;
                                sizeOfSub1Keys = 0;
                                sizeOfSub1Values = 0;
                            } else {
                                sizeOfSub1NullKeys = 0;
                                sizeOfSub1Keys = Object.keys(x).map(x => x.length + 1).reduce((a,b) => a+b);
                                sizeOfSub1Values = Object.values(x).map((x: any) => {
                                    const typeOfSub1Fields = (/^\[\w+\s(.*)\]$/g).exec(Object.prototype.toString.call(x))[1].toLowerCase();
                                    // console.log(typeOfSub1Fields);
                                    switch (typeOfSub1Fields) {
                                        case 'string':
                                            return x.length + 1;

                                        case 'object':
                                            if(x.hasOwnProperty('seconds')) {
                                                return 0 + 8;
                                            };

                                        case 'boolean':
                                            return 0 + 1;

                                        default:
                                            return 0;
                                    }
                                }).reduce((a,b) => a+b, 0);
                                // console.log(sizeOfSub1NullKeys, sizeOfSub1Keys, sizeOfSub1Values);
                                return sizeOfSub1NullKeys + sizeOfSub1Keys + sizeOfSub1Values + 32;
                            };
                        }).reduce((a, b) => a+b, 0)
                    );

                default:
                    return 0;
            }
        }).reduce((a,b) => a+b, 0);
        // console.log(collectionName.length, sizeOfNullKey, sizeOfKeys, sizeOfFields);
        return collectionName.length + 1 + 16 + sizeOfNullKey + sizeOfKeys + sizeOfFields + 32;
    }
}
