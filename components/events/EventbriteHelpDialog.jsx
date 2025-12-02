import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function EventbriteHelpDialog({ open, onOpenChange, redirectUri }) {
    const [copied, setCopied] = useState(false);
    
    // Fallback if not passed
    const uriToUse = redirectUri || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');

    const handleCopy = () => {
        navigator.clipboard.writeText(uriToUse);
        setCopied(true);
        toast.success("Redirect URI copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const isPreviewUrl = uriToUse.includes('modal.host') || uriToUse.includes('preview');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Eventbrite Connection Setup</DialogTitle>
                    <DialogDescription>
                        Fix "Redirect URI hostnames must match" errors by configuring Eventbrite.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    {isPreviewUrl && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 text-sm text-amber-800">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                            <div>
                                <strong>Preview URL Detected:</strong>
                                <p className="mt-1 text-xs">
                                    You are using a temporary preview URL. If this URL changes, you will need to update it in Eventbrite again.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold">1. Copy this Exact URL</Label>
                        <div className="flex items-center gap-2">
                            <Input 
                                readOnly 
                                value={uriToUse} 
                                className="bg-slate-50 font-mono text-xs border-blue-200 text-blue-700"
                            />
                            <Button size="icon" variant="outline" onClick={handleCopy}>
                                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                            This is your current page URL. Eventbrite requires an <strong>exact match</strong>.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold">2. Add to Eventbrite Settings</Label>
                        <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <li>
                                Open your <a href="https://www.eventbrite.com/account/developer/apps/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center font-medium">
                                    Eventbrite Apps <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                            </li>
                            <li>Click on your App (checking the API Key matches).</li>
                            <li>Look for <strong>"Redirect URIs"</strong> (not Website URL).</li>
                            <li>Paste the URL from step 1 into the list.</li>
                            <li>Click <strong>Save</strong>.</li>
                        </ol>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}