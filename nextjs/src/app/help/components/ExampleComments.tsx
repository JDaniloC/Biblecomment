import ExampleCommentButtons from "./ExampleCommentButtons";

export default function ExampleComments() {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
      <p className="leading-relaxed">
        O livro de Gênesis começa com uma verdade absoluta que vai de contrário a muitos pensamentos
        da época:
        <br />
        1 - &quot;No princípio&quot;, significa que houve um início (a título de exemplo os gregos,
        anos depois, acreditavam que o universo sempre existiu, e só foi descoberto que houve um
        início no século XX).
        <br />
        2 - &quot;criou&quot;, não apenas teve um início, mas veio a existir não pelo acaso divino
        ou evolucionista, mas por meio de uma criação planejada.
        <br />
        3 - &quot;Deus&quot;, em contrapartida ao panteísmo essa criação se deu por um único Deus.
        <br />
        Por fim, contrário ao deísmo, esse Deus se importa com suas criaturas.
        <br />
        Ou seja, vai de contrário ao ateísmo, materialismo, humanismo, deísmo, evolucionismo entre
        outras concepções. Mostrando o perigo de tentar enquadrar os ensinos bíblicos em sistemas
        humanos.
      </p>
      <ExampleCommentButtons />
    </div>
  );
}
