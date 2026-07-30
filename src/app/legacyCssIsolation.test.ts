import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('legacy CSS isolation',()=>{
 it('does not expose legacy generic selectors to product routes',()=>{const css=readFileSync('src/styles/main.css','utf8');const forbidden=['button','input','.panel','.hero','.field-entry','.choicegrid','.flow','.candidate','.context-chip','.result','.primary','.error','.brand','.demo','.lead','.scene-wrap','.circle-status','.thread-card','.scenario','.chip','.mist','.core','.core-text','.zone-label','.object-label','.thread','.spark','.status'];for(const selector of forbidden){const unscoped=new RegExp(`(?:^|[},])\\s*${selector.replace('.','\\.')}\\s*(?:[,{:.])`,'m');expect(css,`unscoped ${selector}`).not.toMatch(unscoped)}});
});
