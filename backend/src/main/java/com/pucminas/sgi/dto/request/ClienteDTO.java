package com.pucminas.sgi.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.pucminas.sgi.enums.StatusCliente;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO de entrada para cadastro e atualização de cliente.
 * Aceita "cpf" (frontend) como alias de cpfCnpj.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteDTO {

    /** Cadastro/PUT exigem identificação; PATCH valida somente os campos enviados. */
    public interface Completo extends jakarta.validation.groups.Default {}

    @Size(max = 50)
    private String codigo;

    @NotBlank(message = "Nome é obrigatório", groups = Completo.class)
    @Pattern(regexp = "(?s).*\\S.*", message = "Nome não pode ser vazio")
    @Size(max = 255)
    private String nome;

    @NotBlank(message = "CPF/CNPJ é obrigatório", groups = Completo.class)
    @Pattern(regexp = "(?s).*\\S.*", message = "CPF/CNPJ não pode ser vazio")
    @Size(max = 18)
    @JsonAlias("cpf")
    private String cpfCnpj;

    @Size(max = 255)
    private String email;

    @Size(max = 20)
    private String telefone;

    @Size(max = 20)
    private String celular;

    @Size(max = 500)
    private String endereco;

    private StatusCliente statusCliente;

    @DecimalMin(value = "0", message = "Saldo não pode ser negativo")
    private BigDecimal saldoDevedor;
}
