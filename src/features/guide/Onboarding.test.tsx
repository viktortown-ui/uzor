import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../styles/productPrimitives.css';
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({authenticationState:'authenticated',user:{id:'onboarding-test'}})}));
import { Onboarding } from './Onboarding';

describe('Onboarding actions',()=>{
 it('renders product action classes with owned 44px targets',async()=>{
  render(<Onboarding/>);
  const skip=await screen.findByRole('button',{name:/Пропустить/});
  const next=screen.getByRole('button',{name:'Дальше'});
  expect(skip).toHaveClass('secondary-action');
  expect(next).toHaveClass('primary-action');
  await waitFor(()=>expect(getComputedStyle(next).minHeight).toBe('44px'));
 });
});
