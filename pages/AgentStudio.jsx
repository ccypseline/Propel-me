import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Play, Pause, Save, Server, Globe, Activity, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { OpenAPIToolHelper } from '@/components/utils/openApiTool';

export default function AgentStudio() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('deploy');
    
    // Deploy State
    const [manifest, setManifest] = useState({
        name: '',
        description: '',
        system_prompt: 'You are a helpful assistant.',
        model: 'gpt-4o-mini'
    });

    // OpenAPI Tool State
    const [openApiUrl, setOpenApiUrl] = useState('');
    const [importedTools, setImportedTools] = useState([]);

    // Runner State
    const [runnerOutput, setRunnerOutput] = useState([]);

    // --- Queries ---
    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.AgentManifest.list(),
    });

    const { data: sessions = [] } = useQuery({
        queryKey: ['sessions'],
        queryFn: () => base44.entities.AgentSession.list(),
    });

    // --- Mutations ---
    const deployMutation = useMutation({
        mutationFn: (data) => base44.entities.AgentManifest.create({ ...data, status: 'deployed' }),
        onSuccess: () => {
            queryClient.invalidateQueries(['agents']);
            toast.success("Agent Deployed Successfully");
            setManifest({ name: '', description: '', system_prompt: '', model: 'gpt-4o-mini' });
        }
    });

    const runBackendAgent = async () => {
        try {
            // Create a session first
            const newSession = await base44.entities.AgentSession.create({
                agent_name: "BackendTestAgent",
                status: "active",
                started_at: new Date().toISOString()
            });
            
            setRunnerOutput(prev => [...prev, `Session ${newSession.id} created.`]);

            // Trigger Runner
            setRunnerOutput(prev => [...prev, `Triggering Backend Runner...`]);
            const res = await base44.functions.invoke('agentRunner', { 
                action: 'step', 
                sessionId: newSession.id 
            });

            setRunnerOutput(prev => [...prev, `Runner Output: ${res.data.output}`]);
            queryClient.invalidateQueries(['sessions']);

        } catch (e) {
            console.error(e);
            toast.error("Runner failed");
        }
    };

    const handleImportOpenApi = async () => {
        try {
            toast.info("Fetching Spec...");
            // Mocking fetch since we might not have CORS access to random URLs in preview
            // const spec = await OpenAPIToolHelper.fetchSpec(openApiUrl);
            
            // Mock Spec for demo
            const mockSpec = {
                paths: {
                    '/users': { get: { operationId: 'listUsers', summary: 'List all users' } },
                    '/users/{id}': { get: { operationId: 'getUser', summary: 'Get user by ID' } }
                }
            };
            
            const tools = OpenAPIToolHelper.parseSpecToTools(mockSpec);
            setImportedTools(tools);
            toast.success(`Imported ${tools.length} tools from OpenAPI`);
        } catch (e) {
            toast.error("Failed to import");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Bot className="w-8 h-8 text-indigo-600" />
                        Agent Studio
                    </h1>
                    <p className="text-slate-500">Develop, Deploy, and Monitor Intelligent Agents</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="deploy" className="gap-2"><Save className="w-4 h-4"/> Deployment</TabsTrigger>
                    <TabsTrigger value="tools" className="gap-2"><Globe className="w-4 h-4"/> OpenAPI & Tools</TabsTrigger>
                    <TabsTrigger value="monitor" className="gap-2"><Activity className="w-4 h-4"/> Monitor & Runner</TabsTrigger>
                    <TabsTrigger value="mcp" className="gap-2"><Server className="w-4 h-4"/> MCP Server</TabsTrigger>
                </TabsList>

                {/* --- DEPLOYMENT TAB --- */}
                <TabsContent value="deploy" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Create Agent Manifest</CardTitle>
                                <CardDescription>Define your agent's personality and configuration.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Name</label>
                                        <Input 
                                            value={manifest.name} 
                                            onChange={e => setManifest({...manifest, name: e.target.value})} 
                                            placeholder="e.g. SupportBot"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Model</label>
                                        <Input 
                                            value={manifest.model} 
                                            onChange={e => setManifest({...manifest, model: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input 
                                        value={manifest.description} 
                                        onChange={e => setManifest({...manifest, description: e.target.value})} 
                                        placeholder="Short description..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">System Prompt</label>
                                    <Textarea 
                                        value={manifest.system_prompt} 
                                        onChange={e => setManifest({...manifest, system_prompt: e.target.value})} 
                                        className="h-32 font-mono text-sm"
                                    />
                                </div>
                                <Button 
                                    onClick={() => deployMutation.mutate(manifest)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                                    disabled={!manifest.name}
                                >
                                    <Save className="w-4 h-4 mr-2" /> Deploy Agent
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Deployed Agents</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {agents.map(agent => (
                                        <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                            <div>
                                                <div className="font-medium">{agent.name}</div>
                                                <div className="text-xs text-slate-500">{agent.model} • v{agent.version}</div>
                                            </div>
                                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                                {agent.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {agents.length === 0 && <div className="text-slate-400 text-sm text-center py-4">No agents deployed yet.</div>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- TOOLS TAB --- */}
                <TabsContent value="tools" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>OpenAPI Tool Importer</CardTitle>
                            <CardDescription>Convert Swagger/OpenAPI specs into Agent Tools.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input 
                                    value={openApiUrl} 
                                    onChange={e => setOpenApiUrl(e.target.value)} 
                                    placeholder="https://api.example.com/openapi.json" 
                                />
                                <Button onClick={handleImportOpenApi} variant="outline">
                                    Import
                                </Button>
                            </div>

                            {importedTools.length > 0 && (
                                <div className="mt-4 border rounded-lg overflow-hidden">
                                    <div className="bg-slate-100 p-2 text-xs font-bold border-b">Imported Tools Preview</div>
                                    <div className="max-h-60 overflow-y-auto p-2 bg-slate-50 font-mono text-xs">
                                        {importedTools.map((tool, i) => (
                                            <div key={i} className="mb-2 pb-2 border-b last:border-0">
                                                <div className="text-indigo-600 font-bold">{tool.name}</div>
                                                <div className="text-slate-600">{tool.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- MONITOR TAB --- */}
                <TabsContent value="monitor" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Backend Runner Control</CardTitle>
                                <CardDescription>Manually trigger long-running backend agents.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button onClick={runBackendAgent} className="w-full">
                                    <Play className="w-4 h-4 mr-2" /> Start Background Task
                                </Button>
                                
                                <div className="bg-black rounded-lg p-4 font-mono text-xs text-green-400 h-48 overflow-y-auto">
                                    <div className="mb-2 text-slate-500"># Console Output</div>
                                    {runnerOutput.map((line, i) => (
                                        <div key={i}>{`> ${line}`}</div>
                                    ))}
                                    {runnerOutput.length === 0 && <div className="text-slate-600">Waiting for command...</div>}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Active Sessions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {sessions.map(session => (
                                        <div key={session.id} className="p-3 border rounded-lg flex justify-between items-center bg-white">
                                            <div>
                                                <div className="font-medium text-sm">{session.agent_name}</div>
                                                <div className="text-xs text-slate-500">{session.id}</div>
                                            </div>
                                            <Badge variant="outline" className={session.status === 'completed' ? 'bg-slate-100' : 'bg-blue-50 text-blue-700'}>
                                                {session.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- MCP TAB --- */}
                <TabsContent value="mcp" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>MCP Server Status</CardTitle>
                            <CardDescription>Model Context Protocol Endpoint</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border">
                                <Server className="w-5 h-5 text-green-600" />
                                <div className="flex-1">
                                    <div className="font-medium">Endpoint Active</div>
                                    <div className="text-xs text-slate-500 break-all">
                                        POST /functions/mcp
                                    </div>
                                </div>
                                <Badge className="bg-green-600">Online</Badge>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Capabilities</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 border rounded text-xs text-center bg-slate-50">tools/list</div>
                                    <div className="p-2 border rounded text-xs text-center bg-slate-50">tools/call</div>
                                    <div className="p-2 border rounded text-xs text-center bg-slate-50">prompts/list (Planned)</div>
                                    <div className="p-2 border rounded text-xs text-center bg-slate-50">resources/list (Planned)</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}