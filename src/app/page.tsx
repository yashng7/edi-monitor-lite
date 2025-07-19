"use client"

import { useState, useEffect, type ChangeEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, AlertCircle, MessageSquare, Trash2 } from 'lucide-react'
import { toast } from "sonner"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { DeleteDialog } from "@/components/delete-dialog"

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : '/api'

// Type definitions
interface Document {
  id: string
  originalFilename?: string
  documentType: string
  status: string
  timestamp: string
  records?: Record<string, unknown>[]
}

interface Ticket {
  id: string
  documentId: string
  issue: string
  status: string
  timestamp: string
  notes: { note: string; timestamp: string }[]
}

// Mock data for fallback
const mockDocuments: Document[] = [
  {
    id: "DOC-001",
    originalFilename: "sample_invoice.csv",
    documentType: "Invoice",
    status: "Success",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "DOC-002",
    originalFilename: "purchase_order.csv",
    documentType: "Purchase Order",
    status: "Failed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
]

const mockTickets: Ticket[] = [
  {
    id: "TKT-001",
    documentId: "DOC-002",
    issue: "CSV validation failed",
    status: "Pending",
    timestamp: new Date().toISOString(),
    notes: [{ note: "Initial ticket created", timestamp: new Date().toISOString() }],
  },
]

export default function EDIMonitorDashboard() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type: "document" | "ticket"
    id: string
    title: string
    description: string
  }>({
    open: false,
    type: "document",
    id: "",
    title: "",
    description: "",
  })

  const checkApiConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/documents`, {
        signal: AbortSignal.timeout(5000),
      })
      const data = await response.json()
      setDocuments(data)
      setIsOnline(true)
    } catch (error) {
      console.warn("API not available, using mock data:", error)
      setDocuments(mockDocuments)
      setIsOnline(false)
    }
  }

  const fetchTickets = async () => {
    try {
      const response = await fetch(`${API_URL}/tickets`, {
        signal: AbortSignal.timeout(5000),
      })
      const data = await response.json()
      setTickets(data)
      setIsOnline(true)
    } catch (error) {
      console.warn("API not available, using mock data:", error)
      setTickets(mockTickets)
      setIsOnline(false)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true)
      const apiAvailable = await checkApiConnection()

      if (apiAvailable) {
        await Promise.all([fetchDocuments(), fetchTickets()])
        setIsOnline(true)
      } else {
        setDocuments(mockDocuments)
        setTickets(mockTickets)
        setIsOnline(false)
        toast.info("Demo Mode", {
          description: "API server not available. Using mock data for preview.",
        })
      }
      setIsLoading(false)
    }

    initializeData()
  }, [])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    if (!isOnline) {
      const newDoc: Document = {
        id: `DOC-${String(documents.length + 1).padStart(3, "0")}`,
        originalFilename: selectedFile.name,
        documentType: "CSV Import",
        status: Math.random() > 0.7 ? "Failed" : "Success",
        timestamp: new Date().toISOString(),
      }

      setDocuments((prev) => [newDoc, ...prev])
      setSelectedFile(null)

      toast.success("Demo Upload", {
        description: `File "${selectedFile.name}" processed in demo mode.`,
      })
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      })
      fetchDocuments()
      setSelectedFile(null)
      toast.success("Upload Successful", {
        description: "File uploaded and processed successfully.",
      })
    } catch (error) {
      console.error("Upload failed:", error)
      toast.error("Upload Failed", {
        description: "Failed to upload file. Please try again.",
      })
    }
  }

  const createTicket = async (documentId: string, issue: string) => {
    if (!isOnline) {
      const newTicket: Ticket = {
        id: `TKT-${String(tickets.length + 1).padStart(3, "0")}`,
        documentId,
        issue,
        status: "Pending",
        timestamp: new Date().toISOString(),
        notes: [{ note: "Ticket created in demo mode", timestamp: new Date().toISOString() }],
      }

      setTickets((prev) => [newTicket, ...prev])
      toast.success("Demo Ticket Created", {
        description: `Ticket ${newTicket.id} created for document ${documentId}.`,
      })
      return
    }

    try {
      await fetch(`${API_URL}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, issue }),
      })
      fetchTickets()
      toast.success("Ticket Created", {
        description: `New ticket created for document ${documentId}.`,
      })
    } catch (error) {
      console.error("Failed to create ticket:", error)
      toast.error("Error", {
        description: "Failed to create ticket. Please try again.",
      })
    }
  }

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    if (!isOnline) {
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket)))
      toast.success("Demo Status Updated", {
        description: `Ticket ${ticketId} status changed to ${newStatus}.`,
      })
      return
    }

    try {
      await fetch(`${API_URL}/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchTickets()
      toast.success("Status Updated", {
        description: `Ticket ${ticketId} status updated to ${newStatus}.`,
      })
    } catch (error) {
      console.error("Failed to update ticket status:", error)
      toast.error("Error", {
        description: "Failed to update ticket status. Please try again.",
      })
    }
  }

  const handleAddTicketNote = async (ticketId: string) => {
    const note = prompt("Enter your note:")
    if (!note) return

    if (!isOnline) {
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                notes: [...ticket.notes, { note, timestamp: new Date().toISOString() }],
              }
            : ticket,
        ),
      )
      toast.success("Demo Note Added", {
        description: `Note added to ticket ${ticketId}.`,
      })
      return
    }

    try {
      await fetch(`${API_URL}/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      })
      fetchTickets()
      toast.success("Note Added", {
        description: `Note added to ticket ${ticketId}.`,
      })
    } catch (error) {
      console.error("Failed to add note:", error)
      toast.error("Error", {
        description: "Failed to add note. Please try again.",
      })
    }
  }

  const handleDeleteDocument = (documentId: string) => {
    setDeleteDialog({
      open: true,
      type: "document",
      id: documentId,
      title: "Delete Document",
      description: `Are you sure you want to delete document ${documentId}? This action cannot be undone.`,
    })
  }

  const handleDeleteTicket = (ticketId: string) => {
    setDeleteDialog({
      open: true,
      type: "ticket",
      id: ticketId,
      title: "Delete Ticket",
      description: `Are you sure you want to delete ticket ${ticketId}? This action cannot be undone.`,
    })
  }

  const confirmDelete = async () => {
    const { type, id } = deleteDialog

    if (!isOnline) {
      if (type === "document") {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id))
        toast.success("Demo Document Deleted", {
          description: `Document ${id} deleted in demo mode.`,
        })
      } else {
        setTickets((prev) => prev.filter((ticket) => ticket.id !== id))
        toast.success("Demo Ticket Deleted", {
          description: `Ticket ${id} deleted in demo mode.`,
        })
      }
      setDeleteDialog({ ...deleteDialog, open: false })
      return
    }

    try {
      const endpoint = type === "document" ? "documents" : "tickets"
      await fetch(`${API_URL}/${endpoint}?id=${id}`, {
        method: "DELETE",
      })

      if (type === "document") {
        fetchDocuments()
        toast.success("Document Deleted", {
          description: `Document ${id} has been deleted.`,
        })
      } else {
        fetchTickets()
        toast.success("Ticket Deleted", {
          description: `Ticket ${id} has been deleted.`,
        })
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error)
      toast.error("Delete Failed", {
        description: `Failed to delete ${type}. Please try again.`,
      })
    }

    setDeleteDialog({ ...deleteDialog, open: false })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      Success: { variant: "default" as const, className: "bg-green-500 hover:bg-green-600 text-white" },
      Failed: { variant: "destructive" as const, className: "" },
      Processing: { variant: "secondary" as const, className: "bg-yellow-500 hover:bg-yellow-600 text-white" },
      Pending: { variant: "outline" as const, className: "" },
      "In Progress": { variant: "secondary" as const, className: "bg-blue-500 hover:bg-blue-600 text-white" },
      Resolved: { variant: "default" as const, className: "bg-green-500 hover:bg-green-600 text-white" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "outline" as const, className: "" }

    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header isOnline={isOnline} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header isOnline={isOnline} />

      <main className="flex-1 container mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <p className="text-muted-foreground">
            Monitor and manage your EDI document processing
            {!isOnline && (
              <span className="block text-sm text-orange-600 dark:text-orange-400 mt-1">
                Running in demo mode with mock data
              </span>
            )}
          </p>
        </div>

        {/* Document Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload EDI Document (CSV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Input type="file" onChange={handleFileChange} accept=".csv" className="cursor-pointer" />
              </div>
              <Button onClick={handleUpload} disabled={!selectedFile} className="min-w-[180px]">
                <Upload className="h-4 w-4 mr-2" />
                Upload and Process
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Dashboard Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Monitoring Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document ID</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No documents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.id}</TableCell>
                        <TableCell>{doc.documentType}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>{new Date(doc.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {doc.status === "Failed" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => createTicket(doc.id, "CSV validation failed")}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Create Ticket
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleDeleteDocument(doc.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Issue Tickets Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Issue Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Document ID</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No tickets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.id}</TableCell>
                        <TableCell>{ticket.documentId}</TableCell>
                        <TableCell>{ticket.issue}</TableCell>
                        <TableCell>
                          <Select
                            value={ticket.status}
                            onValueChange={(value) => handleUpdateTicketStatus(ticket.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleAddTicketNote(ticket.id)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Add Note
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteTicket(ticket.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />

      <DeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        onConfirm={confirmDelete}
        title={deleteDialog.title}
        description={deleteDialog.description}
      />
    </div>
  )
}