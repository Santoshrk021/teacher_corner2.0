export function calculateMasterClassroomsFireDocSize(collectionName: string, data: any) {
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
            switch (typeOfField) {
                case 'string':
                    return x.length + 1;

                case 'array':
                    return (
                        x.map(x => {
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

                                        case 'number':
                                            return 0 + 8;

                                        case 'object':
                                            if(x.hasOwnProperty('seconds')) {
                                                return 0 + 8;
                                            } else {
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
                                                    sizeOfSub2Values = Object.values(x).map(x => {
                                                        let sizeOfSub3NullKeys: number;
                                                        let sizeOfSub3Keys: number;
                                                        let sizeOfSub3Values: number;
                                                        if(!Object.keys(x).length) {
                                                            sizeOfSub3NullKeys = 1;
                                                            sizeOfSub3Keys = 0;
                                                            sizeOfSub3Values = 0;
                                                        } else {
                                                            sizeOfSub3NullKeys = 0;
                                                            sizeOfSub3Keys = Object.keys(x).map(x => x.length + 1).reduce((a, b) => a+b);
                                                            sizeOfSub3Values = Object.values(x).map((x: any) => {
                                                                const typeOfSub3Fields = (/^\[\w+\s(.*)\]$/g).exec(Object.prototype.toString.call(x))[1].toLowerCase();
                                                                // console.log(typeOfSub3Fields);
                                                                switch (typeOfSub3Fields) {
                                                                    case 'string':
                                                                        return x.length + 1;

                                                                    case 'array':
                                                                        return (
                                                                            x.map(i => {
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
                                                                                        const typeOfSub4Fields = (/^\[\w+\s(.*)\]$/g).exec(Object.prototype.toString.call(x))[1].toLowerCase();
                                                                                        // console.log(typeOfSub4Fields);
                                                                                        switch (typeOfSub4Fields) {
                                                                                            case 'string':
                                                                                                return x.length + 1;

                                                                                            default:
                                                                                                return 0;
                                                                                        }
                                                                                    }).reduce((a, b) => a+b, 0);
                                                                                }
                                                                                // console.log(sizeOfSub4NullKeys, sizeOfSub4Keys, sizeOfSub4Values);
                                                                                return sizeOfSub4NullKeys + sizeOfSub4Keys + sizeOfSub4Values + 32;
                                                                            }).reduce((a, b) => a+b, 0)
                                                                        );

                                                                    default:
                                                                        return 0;
                                                                }
                                                            }).reduce((a, b) => a+b, 0);
                                                            // console.log(sizeOfSub3NullKeys, sizeOfSub3Keys, sizeOfSub3Values);
                                                            return sizeOfSub3NullKeys + sizeOfSub3Keys + sizeOfSub3Values + 32;
                                                        };
                                                    }).reduce((a, b) => a+b, 0);
                                                };
                                                // console.log(sizeOfSub2NullKeys, sizeOfSub2Keys, sizeOfSub2Values);
                                                return sizeOfSub2NullKeys + sizeOfSub2Keys + sizeOfSub2Values + 32;
                                            }

                                        default:
                                            return 0;
                                    }
                                }).reduce((a, b) => a+b, 0);
                            }
                            // console.log(sizeOfSub1Keys, sizeOfSub1Keys, sizeOfSub1Values);
                            return sizeOfSub1NullKeys + sizeOfSub1Keys + sizeOfSub1Values + 32;
                        }).reduce((a, b) => a+b, 0)
                    );

                case 'object':
                    if(x.hasOwnProperty('seconds')) {
                        return 0 + 8;
                    }
                    break;

                default:
                    return 0;
            }
        }).reduce((a, b) => a+b, 0);
    }
    // console.log(collectionName.length, sizeOfNullKey, sizeOfKeys, sizeOfFields);
    return collectionName.length + 1 + 16 + sizeOfNullKey + sizeOfKeys + sizeOfFields + 32;
};

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
                        x.map(x => {
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