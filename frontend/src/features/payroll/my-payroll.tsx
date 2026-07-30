import { useState, useEffect } from 'react';
import { Table, Button, Badge, Paper, Title, Group, Text } from '@mantine/core';
import { modals } from '@mantine/modals';

export function ListaContrachequesColaborador() {
  const [contracheques, setContracheques] = useState<any[]>([]);

  // Função para buscar a lista do back-end
  const fetchContracheques = async () => {
    const token = localStorage.getItem('seu_token_aqui');
    const res = await fetch('/api/contracheques/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setContracheques(data.items || []);
  };

  useEffect(() => {
    fetchContracheques();
  }, []);

  const assinarDocumento = async (id: number) => {
    const token = localStorage.getItem('seu_token_aqui');
    await fetch(`/api/contracheques/${id}/assinar/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Atualiza a lista na tela para mostrar a Badge verde
    fetchContracheques();
  };

  const abrirPdfParaLeitura = (contracheque: any) => {
    modals.openConfirmModal({
      title: 'Visualizar e Assinar Contracheque',
      size: 'xl',
      children: (
        <>
          <Text size="sm" mb="md">
            Mês de Referência: <b>{contracheque.mes_referencia_label}</b>
          </Text>
          <iframe 
            src={contracheque.arquivo_pdf_url} 
            width="100%" 
            height="500px" 
            style={{ border: 'none', borderRadius: '8px' }} 
          />
          {contracheque.status === 'pendente' && (
            <Text size="xs" color="dimmed" mt="sm" ta="center">
              Ao clicar em "Confirmar Recebimento", seu endereço IP e a data atual serão registrados como assinatura legal.
            </Text>
          )}
        </>
      ),
      labels: { 
        confirm: contracheque.status === 'pendente' ? 'Confirmar Recebimento' : 'Fechar', 
        cancel: 'Cancelar' 
      },
      confirmProps: { 
        color: contracheque.status === 'pendente' ? 'blue' : 'gray',
        // Se já está assinado, o botão de confirmar apenas fecha o modal
        onClick: () => contracheque.status === 'pendente' ? assinarDocumento(contracheque.id) : modals.closeAll()
      },
      cancelProps: { display: contracheque.status === 'pendente' ? 'block' : 'none' }
    });
  };

  const rows = contracheques.map((doc) => (
    <Table.Tr key={doc.id}>
      <Table.Td>{doc.mes_referencia_label}</Table.Td>
      <Table.Td>
        {doc.status === 'pendente' ? (
          <Badge color="red">Pendente</Badge>
        ) : (
          <Badge color="teal">Assinado</Badge>
        )}
      </Table.Td>
      <Table.Td>
        {doc.aceite_digital ? doc.aceite_digital.data_hora_aceite : '-'}
      </Table.Td>
      <Table.Td>
        <Button size="xs" variant="light" onClick={() => abrirPdfParaLeitura(doc)}>
          {doc.status === 'pendente' ? 'Ler e Assinar' : 'Visualizar'}
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper shadow="sm" radius="md" p="xl" withBorder mt={20}>
      <Group justify="space-between" mb="md">
        <Title order={3}>Meus Contracheques</Title>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Mês de Referência</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Data da Assinatura</Table.Th>
            <Table.Th>Ação</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? rows : (
            <Table.Tr>
              <Table.Td colSpan={4} style={{ textAlign: 'center' }}>
                Nenhum contracheque disponível.
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}