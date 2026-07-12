# Mensagem para o cliente — rascunho

Olá! Pra continuar avançando no sistema, preciso de algumas definições e informações de vocês.
Segue a lista, uma de cada vez:

**1. Regras da premiação por plano de carreira**
Hoje o sistema já calcula a comissão de adesão e de recorrência automaticamente, mas o bônus por
plano de carreira (o valor extra que o consultor ganha por vender mais veículos, e o bônus de
quem lidera uma equipe) ainda não está definido no sistema. Preciso que vocês me passem as regras
completas: quantos veículos vendidos dão direito a qual nível de bônus, e como funciona o bônus
de quem lidera a equipe.

**2. O que fazer quando o saldo do mês fica negativo**
Quando um consultor vende um veículo que exige rastreador, é descontado R$100 dele naquele mês.
Se nesse mesmo mês ele não teve adesão nem recorrência suficiente pra cobrir esse desconto, o
saldo dele fica negativo. O que deve acontecer nesse caso?
  - Mostrar o valor negativo mesmo (ele "fica devendo" naquele mês)?
  - Zerar (a empresa absorve esse custo, o consultor não recebe nem deve nada)?
  - Descontar do próximo mês em que ele tiver saldo positivo?

**3. Acesso de teste no Omie**
Pra eu programar a parte financeira do sistema (geração automática das contas a pagar dos
consultores), preciso que vocês me liberem um acesso de teste (sandbox) do Omie.

**4. Alguns consultores demoram muito pra processar**
Descobri que uma pequena parte dos consultores (os que têm centenas de veículos cadastrados)
demora bastante tempo pra gerar o fechamento automático — em alguns casos, mais de 20 minutos.
Isso pode fazer com que a geração automática desses casos específicos falhe quando o sistema
estiver publicado na internet. Por enquanto posso tratar esses poucos casos manualmente, sem
custo extra, ou posso investir mais tempo de desenvolvimento numa solução definitiva. Isso é
urgente pra vocês ou posso seguir com a solução mais simples por enquanto?

**5. Consultores que não ficam com a adesão direto**
Uma pequena parte dos consultores (por volta de 1%) não fica direto com o valor da taxa de
adesão — esse valor passa pela associação antes de ser repassado a eles. Preciso saber quem são
esses casos, pra eu conseguir tratar isso separado dos demais no cálculo.

**6. Variantes da cobrança de recorrência**
A cobrança mensal (Assistência Profissional) tem, no Ileva, um código principal que eu já
confirmei funcionando certinho. Mas existem outros 3 códigos parecidos que nunca apareceram nos
dados que testei até agora. Existem planos ou regiões que usam esses outros códigos? Preciso
confirmar isso pra garantir que ninguém fique de fora do cálculo.

**7. CPF dos consultores**
Hoje, pra dar acesso ao sistema, cada consultor recebe um convite por e-mail pra criar a própria
senha. Uma alternativa mais parecida com o que vocês usam hoje seria usar e-mail + os últimos 5
dígitos do CPF como senha inicial — mas pra isso eu precisaria do CPF de cada consultor, que o
Ileva não me entrega. Vocês têm essa informação disponível em algum outro lugar (planilha, outro
sistema)?

**8. Validar um mês já fechado**
Peço que vocês separem um mês que já foi fechado manualmente (a planilha ou o Power BI de vocês)
pra eu comparar com o que o novo sistema calcula, e confirmarmos juntos que os números batem
antes de considerarmos essa parte pronta.

**9. Tela do Gestor**
Hoje a tela do Gestor mostra o total de comissão, adesão e recorrência de todos os consultores
juntos, e quantos já foram fechados no mês. Tem mais alguma informação financeira que vocês
gostariam de ver resumida ali?
