/**
 * Function checks a document against Firestore limits and constraints.
 * Usage
 *  const errors = validateFirestoreDocument(--document-to-check--, "valid_collection", "valid_doc_id");
 *  console.log(errors.length ? errors : "Document is valid");
 */


export function validateFirestoreDocument(
    doc: Record<string, any>,
    collectionId: string,
    documentId: string,
    depth: number = 1
): string[] {
    const MAX_DOCUMENT_SIZE = 1048576; // 1 MiB
    const MAX_INDEX_ENTRIES = 40000;
    const MAX_FIELD_NAME_SIZE = 1500;
    const MAX_FIELD_VALUE_SIZE = 1048487; // 1 MiB - 89 bytes
    const MAX_DEPTH = 20;
    const MAX_INDEXED_FIELD_VALUE_SIZE = 1500;
    const MAX_COMPOSITE_INDEX_FIELDS = 100;

    const errors: string[] = [];
    let totalSize = 0;
    let indexCount = 0;
    let compositeIndexFields = 0;

    // Check collection ID constraints
    if (!this.isValidFirestoreId(collectionId)) {
        errors.push(`Collection ID "${collectionId}" is invalid.`);
    }

    // Check document ID constraints
    if (!this.isValidFirestoreId(documentId)) {
        errors.push(`Document ID "${documentId}" is invalid.`);
    }

    // Validate the object recursively
    function validateObject(obj: any, path: string = '', currentDepth: number = 1) {
        if (currentDepth > MAX_DEPTH) {
            errors.push(`Maximum nesting depth of ${MAX_DEPTH} exceeded at "${path}".`);
            return;
        }

        for (const key in obj) {
            if (!obj.hasOwnProperty(key)) {continue;}

            const fieldPath = path ? `${path}.${key}` : key;
            const value = obj[key];

            // Validate field name size
            if (getSizeInBytes(key) > MAX_FIELD_NAME_SIZE) {
                errors.push(`Field name "${fieldPath}" exceeds max size of ${MAX_FIELD_NAME_SIZE} bytes.`);
            }

            // Validate field value size
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                const valueSize = getSizeInBytes(value);
                totalSize += valueSize;
                if (valueSize > MAX_FIELD_VALUE_SIZE) {
                    errors.push(`Field "${fieldPath}" value exceeds max size of ${MAX_FIELD_VALUE_SIZE} bytes.`);
                }
                if (valueSize > MAX_INDEXED_FIELD_VALUE_SIZE) {
                    errors.push(`Indexed field "${fieldPath}" exceeds 1500 bytes. Queries may be inconsistent.`);
                }
            } else if (Array.isArray(value)) {
                totalSize += getSizeInBytes(value);
                indexCount += value.length; // Each array item is indexed separately

                if (currentDepth + 1 > MAX_DEPTH) {
                    errors.push(`Array at "${fieldPath}" exceeds max depth of ${MAX_DEPTH}.`);
                }

                for (const item of value) {
                    validateObject(item, fieldPath, currentDepth + 1);
                }
            } else if (typeof value === 'object' && value !== null) {
                validateObject(value, fieldPath, currentDepth + 1);
            } else {
                errors.push(`Unsupported field type at "${fieldPath}".`);
            }

            // Count composite index fields
            compositeIndexFields++;
            if (compositeIndexFields > MAX_COMPOSITE_INDEX_FIELDS) {
                errors.push(`Document exceeds max composite index fields limit of ${MAX_COMPOSITE_INDEX_FIELDS}.`);
            }
        }
    }

    validateObject(doc);

    // Check total size
    if (totalSize > MAX_DOCUMENT_SIZE) {
        errors.push(`Document size (${totalSize} bytes) exceeds max limit of ${MAX_DOCUMENT_SIZE} bytes.`);
    }

    // Check total index entries
    if (indexCount > MAX_INDEX_ENTRIES) {
        errors.push(`Document has ${indexCount} index entries, exceeding the limit of ${MAX_INDEX_ENTRIES}.`);
    }

    // Helper function to calculate size in bytes
    function getSizeInBytes(obj: any): number {
        return new Blob([JSON.stringify(obj)]).size;
    }

    return errors;
}

// Helper function to check if Firestore ID is valid
function isValidFirestoreId(id: string): boolean {
    return (
        typeof id === 'string' &&
        id.length > 0 &&
        id.length <= 1500 &&
        !id.includes('/') &&
        !/^(__.*__|\.)$/.test(id)
    );
}
