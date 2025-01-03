import { XMLParser } from 'fast-xml-parser';

// Procesador para texto plano
export function processPlainText(file: File): Promise<string> {
    return file.text();
}
  
// Procesador para JSON
export function processJSON(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          const plainText = processData(data);
          resolve(plainText)
        } catch (error: unknown) {
            if (error instanceof Error) {
                reject('Error al procesar JSON: ' + error.message);
            } else {
                reject('Error desconocido');
            }
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
}
  
function processData(data: any): string {
    const rows: string[][] = [];
    let headers: string[] = [];
    function flatten(item: any, context: string[] = []): void {
        if (Array.isArray(item)) {
            item.forEach(subItem => flatten(subItem, context));
        } else if (typeof item === 'object' && item !== null) {
            let localContext: string[] = [...context];
            for (const [key, value] of Object.entries(item)) {
                if (Array.isArray(value)) {
                    headers.push(...localContext);
                    value.forEach(subItem => flatten(subItem, [...localContext]));
                } else if (typeof value === 'object' && value !== null) {
                    flatten(value, [...localContext, key]);
                } else {
                    localContext.push(String(value));

                }
            }
            if (localContext.some(item => !headers.includes(item))) {
                rows.push(localContext);
            }
        } else {
            rows.push([...context, String(item)]);
        }
    }
    flatten(data);

    // Filtrar filas incompletas o redundantes
    const filteredRows = rows.filter(row => row.some(col => col.trim() !== ''));

    // Determinar el ancho de cada columna
    const columnWidths = filteredRows.reduce((widths, row) => {
        row.forEach((col, i) => {
            widths[i] = Math.max(widths[i] || 0, col.length);
        });
        return widths;
    }, [] as number[]);

    // Generar las filas formateadas
    return rows.map(row => {
        return row.map((col, i) => col.padEnd(columnWidths[i])).join('\t');
    }).join('\n');        
}

////////////////////////////
// Procesador para CSV
export function processCSV(file: File): Promise<string> {
    return file.text();
}
  
// Procesador para XML
export function processXML(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const parser = new XMLParser();
                const result = parser.parse(reader.result as string);
                console.log(result);
                const plainText = processData(result);
                resolve(plainText);
            } catch (error: unknown) {
                if (error instanceof Error) {
                    reject('Error al procesar XML: ' + error.message);
                } else {
                    reject('Error desconocido');
                }
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

// Procesador para ARFF
export function processARFF(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const content = reader.result as string;
                const lines = content.split('\n');

                let attributes: string[] = [];
                let data: any[] = [];
                let isDataSection = false;

                lines.forEach(line => {
                    const trimmedLine = line.trim();

                    if (trimmedLine.startsWith('%') || trimmedLine === '') {
                        return;
                    }

                    if (trimmedLine.startsWith('@attribute')) {
                        const attributeName = trimmedLine.split(' ')[1];
                        attributes.push(attributeName);
                    }

                    if (trimmedLine.startsWith('@data')) {
                        isDataSection = true;
                        return;
                    }

                    if (isDataSection && trimmedLine) {
                        const row = trimmedLine.split(',').map(value => value.trim().replace(/^['"]|['"]$/g, ''));
                        data.push(row);
                    }
                });

                const resultObject = {
                    attributes: attributes,
                    data: data
                };
                const plainText = resultObject.data.map(row => row.join(' ')).join('\n');
                resolve(plainText);
            } catch (error: unknown) {
                if (error instanceof Error) {
                    reject('Error al procesar ARFF: ' + error.message);
                } else {
                    reject('Error desconocido');
                }
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

// Fábrica para seleccionar el procesador adecuado
export function getFileProcessor(file: File) {
    console.log(file.name.split('.').pop()?.toLowerCase())
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
    switch (fileExtension) {
      case 'txt':
        return processPlainText;
      case 'json':
        return processJSON;
      case 'csv':
        return processCSV;
      case 'xml':
        return processXML;
      case 'arff':
        return processARFF;
      default:
        throw new Error(`Formato de archivo no soportado: ${file.name}`);
    }
}