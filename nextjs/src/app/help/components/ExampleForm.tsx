"use client";

export default function ExampleForm() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 max-w-xs">
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3">
        <input
          readOnly
          disabled
          type="email"
          placeholder="E-mail"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50"
        />
        <input
          readOnly
          disabled
          type="text"
          placeholder="Nome de usuário"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50"
        />
        <input
          readOnly
          disabled
          type="password"
          placeholder="Senha"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50"
        />
        <input
          readOnly
          type="submit"
          value="Cadastrar"
          className="bg-green-500 text-white font-medium py-2 rounded-lg cursor-default opacity-75"
        />
        <hr />
        <button
          type="button"
          disabled
          className="bg-gray-600 text-white font-medium py-2 rounded-lg opacity-75 cursor-default"
        >
          Login
        </button>
      </form>
    </div>
  );
}
