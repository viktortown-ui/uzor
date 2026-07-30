import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const sendCode=vi.fn();const verifyCode=vi.fn();
vi.mock('./AuthProvider',()=>({useAuth:()=>({authenticationState:'unauthenticated',authenticationError:'',sendCode,verifyCode})}));
import { AuthPage } from './AuthPage';
const renderPage=()=>render(<MemoryRouter initialEntries={['/auth?returnTo=/map?delta=kept']}><Routes><Route path="/auth" element={<AuthPage/>}/><Route path="/map" element={<p>Карта открыта</p>}/></Routes></MemoryRouter>);
beforeEach(()=>{sendCode.mockReset().mockResolvedValue(undefined);verifyCode.mockReset().mockResolvedValue(undefined)});
describe('AuthPage keyboard flow',()=>{
 it('submits email with Enter and moves focus to the OTP field',async()=>{const user=userEvent.setup();renderPage();await user.type(screen.getByLabelText('Электронная почта'),'person@example.test{enter}');expect(sendCode).toHaveBeenCalledWith('person@example.test');expect(await screen.findByLabelText('Одноразовый код')).toHaveFocus()});
 it('submits OTP with Enter and restores the intended query route',async()=>{const user=userEvent.setup();renderPage();await user.type(screen.getByLabelText('Электронная почта'),'person@example.test{enter}');const otp=await screen.findByLabelText('Одноразовый код');await user.type(otp,'123456{enter}');expect(verifyCode).toHaveBeenCalledWith('person@example.test','123456');expect(await screen.findByText('Карта открыта')).toBeInTheDocument()});
 it('blocks duplicate email submissions while the first request is pending',async()=>{let resolve!:()=>void;sendCode.mockReturnValue(new Promise<void>(done=>{resolve=done}));renderPage();const input=screen.getByLabelText('Электронная почта');fireEvent.change(input,{target:{value:'person@example.test'}});const form=input.closest('form')!;fireEvent.submit(form);fireEvent.submit(form);expect(sendCode).toHaveBeenCalledTimes(1);resolve();await waitFor(()=>expect(screen.getByLabelText('Одноразовый код')).toBeInTheDocument())});
 it('shows and disables the resend cooldown after sending',async()=>{const user=userEvent.setup();renderPage();await user.type(screen.getByLabelText('Электронная почта'),'person@example.test{enter}');expect(await screen.findByRole('button',{name:/Повторная отправка через 30 с/})).toBeDisabled()});
});
