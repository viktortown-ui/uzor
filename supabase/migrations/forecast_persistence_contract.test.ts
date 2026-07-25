import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const sql=readFileSync('supabase/migrations/007_forecast_persistence_deadline_v1.sql','utf8');
describe('forecast migration static contract (not deployment validation)',()=>{
 it('enables RLS and defines no direct policies',()=>{expect(sql.match(/enable row level security/g)).toHaveLength(3);expect(sql).not.toMatch(/create\s+policy/i);});
 it('revokes defaults and minimally grants RPC execution',()=>{expect(sql).toMatch(/revoke all on function public\.get_forecast_workspace/);expect(sql).toMatch(/grant execute on function public\.submit_forecast[^;]+to authenticated/);expect(sql).not.toMatch(/grant execute on function public\.submit_forecast[^;]+anon/);});
 it('uses auth uid and captures server time after the event row lock',()=>{expect(sql).toContain('auth.uid()');expect(sql.indexOf('server_time := clock_timestamp()')).toBeGreaterThan(sql.indexOf('where id=input_event_id for share'));expect(sql).toContain('server_time >= e.closes_at');});
 it('accepts no user or timestamp submit arguments',()=>{const signature=sql.match(/create function public\.submit_forecast\(([^)]*)\)/)?.[1]??'';expect(signature).not.toMatch(/user|timestamp|created|updated/);});
 it('enforces one forecast per user/event and composite option ownership',()=>{expect(sql).toContain('unique(event_id,user_id)');expect(sql).toContain('foreign key(event_id,selected_option_id) references public.forecast_options(event_id,id)');});
 it('uses FOUND-based insert/update without PostgreSQL system columns',()=>{expect(sql).toMatch(/on conflict\(event_id,user_id\) do nothing returning \* into f;\s*inserted := found;/);expect(sql).toMatch(/update public\.user_forecasts[\s\S]+returning \* into f;/);expect(sql).toContain("forecast_internal_write_conflict");expect(sql).not.toMatch(/\bxmax\b/);});
});
