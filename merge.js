const fs = require('fs');

const content = fs.readFileSync('C:/Users/jk115873/Desktop/mirage catalogo on/produtos.js', 'utf8');
const arrayStr = content.substring(content.indexOf('['), content.lastIndexOf(']') + 1);
const todos = eval(arrayStr);

const grouped = {};

for (const p of todos) {
    let baseName = p.nome;
    const match = p.nome.match(/^(.*?)\s*\(.*?\)$/);
    if (match) {
        baseName = match[1].trim();
    }
    
    const key = `${p.marca}-${baseName}`;
    if (!grouped[key]) {
        grouped[key] = { ...p, nome: baseName, imgs: [...p.imgs] };
    } else {
        for (const img of p.imgs) {
            if (!grouped[key].imgs.includes(img)) {
                grouped[key].imgs.push(img);
            }
        }
    }
}

let idCounter = 1;
const newTodos = Object.values(grouped).map(p => {
    if (p.imgs.length === 1) {
        p.imgs.push('https://via.placeholder.com/400x533/1e1e1e/666666?text=MIRAGE');
    }
    p.id = idCounter++;
    return p;
});

let output = `/* ─── PRODUTOS MIRAGE CO. ─────────────────────────────────────────────────── */
/* Para adicionar produto: copie um bloco e edite os campos                    */
/* imgs: array de nomes de arquivo no R2 (primeira foto = capa do card)        */
/* badge: 'Hot' | 'Limited' | 'Novo' | 'Raro' | ''                            */
/* tipo: 'moletons' | 'jaquetas' | 'camisetas' | 'calcas' | 'sueteres'        */

const todos = [\n`;

output += newTodos.map(p => `  ${JSON.stringify(p)}`).join(',\n');
output += `\n];\n`;

fs.writeFileSync('C:/Users/jk115873/Desktop/mirage catalogo on/produtos.js', output, 'utf8');
console.log(`Merged smoothly! Original count: ${todos.length} -> Final count: ${newTodos.length}`);
