'use client'
import { createContext, useContext, type ReactNode } from 'react'

type Site = { loginMode: 'guest' | 'account' | 'otp' }
const Ctx = createContext<Site>({ loginMode: 'guest' })
export const useSite = () => useContext(Ctx)
export const SiteProvider = ({ loginMode, children }: Site & { children: ReactNode }) => <Ctx.Provider value={{ loginMode }}>{children}</Ctx.Provider>
