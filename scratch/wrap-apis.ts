import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const project = new Project();
project.addSourceFilesAtPaths(path.join(__dirname, '../src/app/api/**/route.ts'));

const sourceFiles = project.getSourceFiles();
console.log(`Found ${sourceFiles.length} route files.`);

for (const sourceFile of sourceFiles) {
  let needsImport = false;
  
  // Find exported functions named GET, POST, PUT, DELETE, PATCH
  const functions = sourceFile.getFunctions().filter(f => {
    const name = f.getName();
    return f.isExported() && ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(name || '');
  });

  for (const func of functions) {
    const name = func.getName()!;
    const isAsync = func.isAsync();
    const parameters = func.getParameters().map(p => p.getText()).join(', ');
    const returnType = func.getReturnTypeNode() ? `: ${func.getReturnTypeNode()!.getText()}` : '';
    const body = func.getBodyText() || '';
    
    // Remove the original function
    func.remove();
    
    // Add the wrapped variable statement
    sourceFile.addVariableStatement({
      isExported: true,
      declarations: [{
        name,
        initializer: `withLogging(${isAsync ? 'async ' : ''}function(${parameters})${returnType} {\n${body}\n})`
      }]
    });
    
    needsImport = true;
  }
  
  // Also check for arrow functions exported as const GET = ...
  const variableDeclarations = sourceFile.getVariableDeclarations().filter(v => {
    const name = v.getName();
    return v.isExported() && ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(name || '');
  });

  for (const v of variableDeclarations) {
    const name = v.getName();
    const initializer = v.getInitializer();
    if (initializer && !initializer.getText().startsWith('withLogging(')) {
      v.setInitializer(`withLogging(${initializer.getText()})`);
      needsImport = true;
    }
  }

  if (needsImport) {
    const hasImport = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue().includes('api-logger'));
    if (!hasImport) {
      // Calculate relative path
      const relativePath = path.relative(sourceFile.getDirectoryPath(), path.join(__dirname, '../src/lib/api-logger')).replace(/\\/g, '/');
      sourceFile.addImportDeclaration({
        namedImports: ['withLogging'],
        moduleSpecifier: relativePath.startsWith('.') ? relativePath : `./${relativePath}`
      });
    }
  }
}

project.saveSync();
console.log('Finished applying withLogging wrapper to all API routes.');

