// tslint:disable no-console
import * as tsc from 'typescript';

interface TypeInfo {
    typeName: string;
    parameterDocs: Array<{ name: string, text: string }>;
    returnDocs?: string;
    example?: string;
    description: string;
    fileName: string;
}

const tsConfig = {
    baseUrl: "src/",
};

const files = [
    { path: 'src/index.ts' },
];

const classIsExported = (node: tsc.Node): node is tsc.ClassDeclaration => {
    return !!node.parent && isNodeExported(node.parent) && tsc.isClassDeclaration(node.parent);
};

const buildTypeInfoFromNode = (fileName: string, checker: tsc.TypeChecker, node: tsc.Node, parentName?: string): TypeInfo | undefined => {
    if (!isNodeExported(node) && !classIsExported(node)) return; // we only need to document exported types
    if (!(tsc.isTypeAliasDeclaration(node) || tsc.isFunctionDeclaration(node) || tsc.isClassDeclaration(node) || tsc.isMethodDeclaration(node))) return; // we only need to document types, functions, and classes

    const symbol = checker.getSymbolAtLocation(node.name!);
    if (!symbol) return; // we should never get into this state because we aren't dealing with .d.ts files

    // Get the JSDoc description
    const description = tsc.displayPartsToString(symbol.getDocumentationComment(checker));

    // Don't document things with `no-doc` at start of description
    if (description.trim().startsWith('no-doc')) return;

    const typeName = parentName ? `${parentName}.${symbol.name}` : symbol.name;

    const jsDocTags = symbol.getJsDocTags();

    const parameterDocs = jsDocTags
        .filter(tag => tag.name === 'param')
        .map(tag => tag.text)
        .filter(text => !!text)
        .map(text => {
            const [ name, ...docWords] = text!.split(' ');
            return {
                name,
                text: docWords.join(' '),
            };
        });

    const returnDocs = jsDocTags
        .filter(tag => tag.name === 'returns')
        .map(tag => tag.text)
        .filter(text => !!text);

    const example = jsDocTags
        .filter(tag => tag.name === 'example')
        .map(tag => tag.text)
        .filter(text => !!text)[0];

    const typeInfo: TypeInfo = {
        typeName,
        parameterDocs,
        returnDocs: returnDocs[0],
        example,
        description,
        fileName,
    };

    return typeInfo;
};

const generateMarkdown = (fileName: string) => {
    const program = tsc.createProgram([fileName], tsConfig);
    const checker = program.getTypeChecker();

    for (const sourceFile of program.getSourceFiles()) {
        if (sourceFile.fileName !== fileName) continue; // we don't care about imported source files, only the single file we are inspecting

        const sourceDocs = [] as TypeInfo[];

        tsc.forEachChild(sourceFile, (node) => {
            const typeInfo = buildTypeInfoFromNode(fileName, checker, node);

            if (typeInfo) sourceDocs.push(typeInfo);

            if (tsc.isClassDeclaration(node) && typeInfo) {
                // iterate over class members
                node.members
                    .map((node) => buildTypeInfoFromNode(fileName, checker, node, typeInfo.typeName))
                    .forEach(typeInfo => typeInfo && sourceDocs.push(typeInfo));

            }
        });

        // drop any repeated definitions (for overloaded functions)
        const filteredSourceDocs = sourceDocs
            .reduce((coll, item) => {
                const exists = coll.find(s => s.typeName === item.typeName);
                if (exists) return coll;

                return [...coll, item];
            }, [] as TypeInfo[])
            .sort((a, b) => a.typeName.localeCompare(b.typeName));

        const renderedSections = filteredSourceDocs
            .map(typeInfo => {
                const header = `### ${typeInfo.typeName}`;
                const description = `${typeInfo.description}`;

                const parameters = typeInfo.parameterDocs.map(param => {
                    return `| ${param.name} | ${param.text} |`;
                }).join('\n');

                const table = typeInfo.parameterDocs.length > 0 ?
                    `\n| Param | Description |\n| --- | --- |\n${parameters}`
                    : '';

                const example = typeInfo.example
                    ? `#### Example\n ${typeInfo.example}`
                    : '';

                const parts = [
                    header,
                    description,
                    table,
                    example,
                ].filter(part => !!part);

                return parts.join('\n');
            });

        const markdown = renderedSections.join('\n\n');

        return {
            markdown,
        };
    }
};

const headerString =
`# validtyped
[![Build Status](https://travis-ci.org/andnp/ValidTyped.svg?branch=master)](https://travis-ci.org/andnp/ValidTyped)

A runtime and compile-time type checker library.

---



`;

const docString = files.map(file => {
    const doc = generateMarkdown(file.path);

    if (!doc) return console.log(file);

    return `${doc.markdown}\n`;
}).join('\n');

const markdown = headerString + docString;
console.log(markdown);


/** True if this is visible outside this file, false otherwise */
function isNodeExported(node: tsc.Node): boolean {
    return (tsc.getCombinedModifierFlags(node) & tsc.ModifierFlags.Export) !== 0 || (!!node.parent && node.parent.kind === tsc.SyntaxKind.SourceFile); // tslint:disable-line no-bitwise
}
