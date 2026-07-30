import { useState, useEffect } from 'react';
import { Button, FileInput, Select, Title, Paper, Stack, Notification } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconUpload, IconCheck, IconX } from '@tabler/icons-react';

export function UploadContracheque() {
    // 1. Tipagem ajustada para o formato que o Select do Mantine exige
    const [colaboradores, setColaboradores] = useState<{ value: string; label: string }[]>([]);
    const [colaboradorId, setColaboradorId] = useState<string | null>(null);
    const [mesReferencia, setMesReferencia] = useState<Date | null>(null);
    const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Busca a lista de colaboradores para preencher o Select
    useEffect(() => {
        async function fetchColaboradores() {
            try {
                const res = await fetch('https://asset-flow-production-17bf.up.railway.app/api/collaborators/', {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!res.ok) {
                    throw new Error(`Falha na API: Status ${res.status}`);
                }

                const data = await res.json();

                // Trata os dados independentemente de como o Django os envelopou
                const lista = Array.isArray(data) ? data : (data.results || data.items || []);

                const formatados = lista.map((c: any) => ({
                    value: String(c.id),
                    label: c.nome || c.name || 'Sem Nome'
                }));

                setColaboradores(formatados);

            } catch (err) {
                console.error("Erro ao buscar colaboradores:", err);
            }
        }

        fetchColaboradores();
    }, []);

    const handleUpload = async () => {
        if (!colaboradorId || !mesReferencia || !arquivoPdf) {
            setStatus({ type: 'error', message: 'Preencha todos os campos e anexe o PDF.' });
            return;
        }

        setLoading(true);
        setStatus(null);

        // Como estamos enviando um arquivo físico, usamos FormData em vez de JSON
        const formData = new FormData();
        formData.append('colaborador_id', colaboradorId);
        // Formata a data para YYYY-MM-DD para o Django entender
        formData.append('mes_referencia', mesReferencia.toISOString().split('T')[0]);
        formData.append('arquivo_pdf', arquivoPdf);

        try {
            // 1. Atualizamos para a URL do Railway (Ajuste 'contracheques' se a sua rota no Django for 'payroll')
            const response = await fetch('https://asset-flow-production-17bf.up.railway.app/api/contracheques/', {
                method: 'POST',
                credentials: 'include', // <-- 2. A mesma mágica dos cookies para ele saber quem está logado!
                body: formData
                // Nota: Omitimos o 'headers' de propósito. O navegador cria o Content-Type correto com o "boundary" do arquivo sozinho!
            });

            // Como o erro pode não ser de rede, precisamos ler o que o Django reclamou
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || errorData?.error || `Erro ${response.status} no servidor`);
            }

            const data = await response.json();
            console.log("Sucesso no upload!", data);

            setStatus({ type: 'success', message: 'Contracheque enviado com sucesso!' });
            setColaboradorId(null);
            setMesReferencia(null);
            setArquivoPdf(null);

        } catch (error: any) {
            console.error("Erro detalhado do upload:", error);
            setStatus({ type: 'error', message: error.message || 'Erro de conexão com o servidor.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper shadow="sm" radius="md" p="xl" withBorder w={500} mx="auto" mt={50}>
            <Title order={3} mb="lg">Enviar Contracheque</Title>

            <Stack gap="md">
                <Select
                    label="Colaborador"
                    placeholder="Selecione o funcionário"
                    data={colaboradores}
                    value={colaboradorId}
                    onChange={(val) => setColaboradorId(val)}
                    searchable
                    required
                />

                <DateInput
                    label="Mês de Referência"
                    placeholder="Ex: 01/06/2026"
                    valueFormat="DD/MM/YYYY"
                    value={mesReferencia}
                    onChange={(date) => setMesReferencia(date ? new Date(date) : null)}
                    required
                />

                <FileInput
                    label="Arquivo PDF"
                    placeholder="Clique para anexar o holerite"
                    accept="application/pdf"
                    leftSection={<IconUpload size={14} />}
                    value={arquivoPdf}
                    onChange={(file) => setArquivoPdf(file)}
                    required
                />

                <Button
                    onClick={handleUpload}
                    loading={loading}
                    mt="md"
                    fullWidth
                >
                    Fazer Upload
                </Button>

                {status && (
                    <Notification
                        icon={status.type === 'success' ? <IconCheck size={18} /> : <IconX size={18} />}
                        color={status.type === 'success' ? 'teal' : 'red'}
                        onClose={() => setStatus(null)}
                    >
                        {status.message}
                    </Notification>
                )}
            </Stack>
        </Paper>
    );
}