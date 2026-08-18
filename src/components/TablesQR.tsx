import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/db";
import {
  Plus, QrCode, Printer, RefreshCcw, Trash2, Eye, EyeOff,
  Table2, CheckCircle2, XCircle, Clock, Download, Copy, Check
} from "lucide-react";

interface TablesQRProps {
  restaurantId: string;
  userRole: string;
}

// Real QR Code generator using a free API
function generateQRCode(data: string, size: number = 200): string {
  const encodedData = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
}

export function TablesQR({ restaurantId, userRole }: TablesQRProps) {
  const [tables, setTables] = useState(db.getTables(restaurantId));
  const [showAddTable, setShowAddTable] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshTables = () => {
    setTables(db.getTables(restaurantId));
  };

  const handleAddTable = () => {
    const table = db.createTable({
      restaurantId,
      name: newTableName || `Table ${tables.length + 1}`,
      status: "AVAILABLE",
    });
    
    db.addActivityLog({
      restaurantId,
      userId: "current-user",
      userName: "Restaurant Manager",
      action: "TABLE_CREATED",
      details: `Table ${table.tableNumber} created with QR code`,
    });

    setShowAddTable(false);
    setNewTableName("");
    refreshTables();
  };

  const handleDeleteTable = (table: any) => {
    if (confirm(`Are you sure you want to delete ${table.name}? This will also remove its QR code.`)) {
      db.deleteTable(table.id);
      db.addActivityLog({
        restaurantId,
        userId: "current-user",
        userName: "Restaurant Manager",
        action: "TABLE_DELETED",
        details: `Table ${table.tableNumber} deleted`,
      });
      refreshTables();
    }
  };

  const handleRegenerateQR = (table: any) => {
    if (confirm(`Regenerate QR code for ${table.name}? The old QR will become invalid.`)) {
      db.regenerateTableQR(table.id);
      db.addActivityLog({
        restaurantId,
        userId: "current-user",
        userName: "Restaurant Manager",
        action: "QR_REGENERATED",
        details: `QR code regenerated for ${table.name}`,
      });
      refreshTables();
    }
  };

  const handleToggleQR = (table: any) => {
    db.updateTable(table.id, { qrEnabled: !table.qrEnabled });
    refreshTables();
  };

  const handlePrintAll = () => {
    setShowPrintPreview(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = async (text: string, tableId: string) => {
    try {
      // Try using the Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
        } catch (err) {
          console.error("Failed to copy text: ", err);
        }
        document.body.removeChild(textArea);
      }
      setCopiedId(tableId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // Final fallback - show the link in a prompt
      prompt("Copy this link:", text);
    }
  };

  const handleCopyLink = (table: any) => {
    const restaurant = db.getRestaurant(restaurantId);
    const link = `${window.location.origin}/m/${restaurant?.slug}/table/${table.tableNumber}`;
    copyToClipboard(link, table.id);
  };

  const filteredTables = tables.filter(t => 
    filterStatus === "ALL" || t.status === filterStatus
  );

  const getTableStatus = (tableId: string) => {
    const orders = db.getOrdersByTable(tableId);
    const activeOrder = orders.find(o => o.status === "NEW" || o.status === "CONFIRMED" || o.status === "PREPARING" || o.status === "READY");
    return activeOrder ? "OCCUPIED" : "AVAILABLE";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tables & QR Codes</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your tables and generate unique QR codes for each one
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handlePrintAll}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print All QR Codes
          </Button>
          <Button
            onClick={() => setShowAddTable(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Table2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Tables</p>
              <p className="text-2xl font-bold text-slate-900">{tables.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Available</p>
              <p className="text-2xl font-bold text-slate-900">
                {tables.filter(t => getTableStatus(t.id) === "AVAILABLE").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Occupied</p>
              <p className="text-2xl font-bold text-slate-900">
                {tables.filter(t => getTableStatus(t.id) === "OCCUPIED").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active QR Codes</p>
              <p className="text-2xl font-bold text-slate-900">
                {tables.filter(t => t.qrEnabled).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Tables</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="OCCUPIED">Occupied</SelectItem>
            <SelectItem value="RESERVED">Reserved</SelectItem>
            <SelectItem value="CLEANING">Cleaning</SelectItem>
            <SelectItem value="DISABLED">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTables.map(table => {
          const status = getTableStatus(table.id);
          const restaurant = db.getRestaurant(restaurantId);
          const qrLink = `${window.location.origin}/m/${restaurant?.slug}/table/${table.tableNumber}`;
          const qrImage = generateQRCode(qrLink);
          
          return (
            <Card key={table.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{table.name}</h3>
                    <p className="text-sm text-slate-500">Table #{table.tableNumber}</p>
                  </div>
                  <Badge variant={status === "AVAILABLE" ? "default" : status === "OCCUPIED" ? "secondary" : "destructive"}>
                    {status}
                  </Badge>
                </div>

                {/* QR Code Display */}
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <img 
                      src={qrImage} 
                      alt={`QR Code for ${table.name}`}
                      className="w-40 h-40 rounded-lg border-2 border-slate-200"
                    />
                    {!table.qrEnabled && (
                      <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center rounded-lg">
                        <XCircle className="w-8 h-8 text-red-500" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Table Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">QR Status:</span>
                    <Badge variant={table.qrEnabled ? "default" : "destructive"}>
                      {table.qrEnabled ? "ACTIVE" : "DISABLED"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Link:</span>
                    <span className="text-slate-700 font-medium truncate max-w-[150px]">
                      /m/{restaurant?.slug}/table/{table.tableNumber}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTable(table);
                        setShowQRModal(true);
                      }}
                      className="text-slate-600"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(table)}
                      className="text-slate-600"
                    >
                      {copiedId === table.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRegenerateQR(table)}
                      className="text-amber-600"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleQR(table)}
                      className={table.qrEnabled ? "text-red-600" : "text-emerald-600"}
                    >
                      {table.qrEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTable(table)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Table Dialog */}
      <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
            <DialogDescription>
              Create a new table with a unique QR code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Table Name</Label>
              <Input
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder={`Table ${tables.length + 1}`}
              />
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-sm text-slate-600">
                A unique QR code will be automatically generated for this table.
                Customers can scan it to view the menu and place orders.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTable(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTable} className="bg-emerald-600 hover:bg-emerald-700">
              Create Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md">
          {selectedTable && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTable.name} - QR Code</DialogTitle>
                <DialogDescription>
                  Scan this QR code to open the customer menu for this table
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-4">
                <div className="p-6 bg-white rounded-xl border-2 border-slate-200">
                  <img 
                    src={generateQRCode(`${window.location.origin}/m/${db.getRestaurant(restaurantId)?.slug}/table/${selectedTable.tableNumber}`)} 
                    alt={`QR Code for ${selectedTable.name}`}
                    className="w-56 h-56"
                  />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900">{db.getRestaurant(restaurantId)?.name}</p>
                  <p className="text-sm text-slate-500">{selectedTable.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleCopyLink(selectedTable)}
                    className="text-slate-600"
                  >
                    {copiedId === selectedTable.id ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copiedId === selectedTable.id ? "Copied!" : "Copy Link"}
                  </Button>
                  <Button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>${selectedTable.name} QR Code</title>
                              <style>
                                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
                                .container { text-align: center; }
                                img { width: 300px; height: 300px; }
                                h2 { margin: 10px 0; }
                                p { color: #666; }
                              </style>
                            </head>
                            <body>
                              <div class="container">
                                <h2>${db.getRestaurant(restaurantId)?.name}</h2>
                                <img src="${generateQRCode(`${window.location.origin}/m/${db.getRestaurant(restaurantId)?.slug}/table/${selectedTable.tableNumber}`)}" />
                                <h3>${selectedTable.name}</h3>
                                <p>Scan to view menu and order</p>
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print QR
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Print All Preview */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print All QR Codes</DialogTitle>
            <DialogDescription>
              Preview all table QR codes before printing
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
            {tables.map(table => (
              <div key={table.id} className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center">
                <p className="font-bold text-slate-900 mb-2">{db.getRestaurant(restaurantId)?.name}</p>
                <img 
                  src={generateQRCode(`${window.location.origin}/m/${db.getRestaurant(restaurantId)?.slug}/table/${table.tableNumber}`)} 
                  alt={`QR Code for ${table.name}`}
                  className="w-32 h-32 mx-auto mb-2"
                />
                <p className="font-medium text-slate-700">{table.name}</p>
                <p className="text-xs text-slate-500">Table #{table.tableNumber}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700">
              <Printer className="w-4 h-4 mr-2" />
              Print All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}