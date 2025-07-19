"use client"
import { ThemeToggle } from "./theme-toggle"
import { Wifi, WifiOff } from 'lucide-react'

interface HeaderProps {
  isOnline: boolean
}

export function Header({ isOnline }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">EDI Monitor Lite</h1>
          {isOnline ? (
            <div title="Connected to API">
              <Wifi className="h-5 w-5 text-green-500" />
            </div>
          ) : (
            <div title="Demo Mode - API Offline">
              <WifiOff className="h-5 w-5 text-orange-500" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{isOnline ? "Live Data" : "Demo Mode"}</span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}