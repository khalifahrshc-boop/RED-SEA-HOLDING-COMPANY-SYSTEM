export function numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    num = Math.floor(Math.abs(num)); 
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

    const toWords = (nStr: string) => {
        let nObj = parseInt(nStr);
        if(nObj === 0) return '';
        let s = '';
        if (Math.floor(nObj/100) > 0) {
            s += a[Math.floor(nObj/100)] + 'Hundred ';
            nObj %= 100;
        }
        if (nObj > 0) {
            if (nObj < 20) {
                s += a[nObj];
            } else {
                s += b[Math.floor(nObj/10)] + (nObj%10 > 0 ? '-' + a[nObj%10] : ' ');
            }
        }
        return s;
    };

    let n = ('000000000' + num).substr(-9).match(/^(\d{3})(\d{3})(\d{3})$/);
    if(!n) return '';
    let str = '';
    let millions = parseInt(n[1]);
    let thousands = parseInt(n[2]);
    let units = parseInt(n[3]);

    if (millions) str += toWords(n[1]) + 'Million ';
    if (thousands) str += toWords(n[2]) + 'Thousand ';
    if (units) str += toWords(n[3]);

    return str.trim() + ' Saudi Riyals Only';
}

export function numberToWordsAr(num: number): string {
    // Basic arabic placeholder
    return "فقط " + num.toLocaleString('en-US') + " ريال سعودي لا غير";
}
