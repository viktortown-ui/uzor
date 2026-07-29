import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('legacy CSS isolation',()=>{
 it('does not expose legacy generic selectors to product routes',()=>{const css=readFileSync('src/styles/main.css','utf8');const forbidden=['button','input','.panel','.hero','.field-entry','.choicegrid','.flow','.candidate','.context-chip','.result','.primary','.error'];for(const selector of forbidden){const unscoped=new RegExp(`(?:^|[},])\\s*${selector.replace('.','\\.')}\\s*(?:[,{:.])`,'m');expect(css,`unscoped ${selector}`).not.toMatch(unscoped)}});
});
