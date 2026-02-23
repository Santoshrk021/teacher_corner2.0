export interface componet {
    attribute?:    string;
    materialName?: string;
    creationDate?: CreatedAt;
    sizeUnit?:     string;
    createdAt?:    CreatedAt;
    category?:     string;
    materialCode?: number;
    updatedAt?:    CreatedAt;
    imageUrl?:     any[];
    docId?:        string;
    size?:         Size;
    materialType?: string;
}

export interface CreatedAt {
    seconds?:     number;
    nanoseconds?: number;
}

export interface Size {
    default?: number;
}
