 export async function genearateKeyNumber(length: number): Promise<string> {
return Math.random().toString().slice(2, 2 + length);
}
