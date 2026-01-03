import { ReactNode } from 'react';

export const dynamicParams = true;

export async function generateStaticParams() {
    return [];
}

export default function Layout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
