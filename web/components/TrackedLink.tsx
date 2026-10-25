'use client'
import Link from 'next/link'
import type { ComponentProps } from 'react'
import { trackContactClick, trackSelectItem, type AItem } from '@/lib/analytics'

/** A product link that reports select_item when it is opened. */
export function SelectLink({ item, ...rest }: ComponentProps<typeof Link> & { item: AItem }) {
  return <Link {...rest} onClick={() => trackSelectItem(item)} />
}

/** A phone or WhatsApp link that reports contact_click. */
export function ContactLink({ kind, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { kind: 'whatsapp' | 'call' }) {
  return <a {...rest} onClick={() => trackContactClick(kind)} />
}
