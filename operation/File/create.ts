import * as fs from 'fs';
import * as path from 'path';
import { CreateOptions } from './type';

/**
 * Create a new file
 * @param options.path Path to create the file
 * @param options.content Optional content to write to the file
 */
export async function create(options: CreateOptions): Promise<void> {
    const { path: filePath, content = '' } = options;

    // Ensure parent directory exists
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }

    // Check if file already exists
    if (fs.existsSync(filePath)) {
        throw new Error(`File already exists: ${filePath}`);
    }

    // Create file with optional content
    fs.writeFileSync(filePath, content, 'utf-8');
}
