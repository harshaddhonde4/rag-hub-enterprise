declare module 'pdf-parse' {
  const parse: (data: Buffer) => Promise<{ text: string }>;
  export default parse;
}
