"use client";

import { Header } from "@/components/layout/Header";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <Container className="py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
                <Card className="p-8 text-center">
                    <p className="text-gray-600">Settings page coming soon</p>
                </Card>
            </Container>
        </div>
    );
}
