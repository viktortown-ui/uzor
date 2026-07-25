import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser=vi.fn();
vi.mock('./client',()=>({getSupabaseClient:()=>({auth:{getUser}})}));
import { getCurrentAuthenticatedUser } from './auth';

const user=(change:Partial<User>={}):User=>({id:'user-id',aud:'authenticated',role:'authenticated',email:'user@example.test',app_metadata:{},user_metadata:{},identities:[],created_at:'2026-01-01T00:00:00Z',...change});
beforeEach(()=>getUser.mockReset());

describe('getCurrentAuthenticatedUser',()=>{
 it('returns null when Supabase has no user',async()=>{getUser.mockResolvedValue({data:{user:null},error:null});await expect(getCurrentAuthenticatedUser()).resolves.toBeNull();});
 it('returns null for an anonymous Supabase user',async()=>{getUser.mockResolvedValue({data:{user:user({is_anonymous:true})},error:null});await expect(getCurrentAuthenticatedUser()).resolves.toBeNull();});
 it('returns a normal explicitly non-anonymous user',async()=>{const account=user({is_anonymous:false});getUser.mockResolvedValue({data:{user:account},error:null});await expect(getCurrentAuthenticatedUser()).resolves.toBe(account);});
 it('returns a legacy user without is_anonymous',async()=>{const account=user();getUser.mockResolvedValue({data:{user:account},error:null});await expect(getCurrentAuthenticatedUser()).resolves.toBe(account);});
 it('throws an auth error to the caller',async()=>{const error=new Error('auth unavailable');getUser.mockResolvedValue({data:{user:null},error});await expect(getCurrentAuthenticatedUser()).rejects.toBe(error);});
});
