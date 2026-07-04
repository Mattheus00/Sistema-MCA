package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório JPA para a entidade Cliente.
 */
@Repository
public interface ClienteRepository extends JpaRepository<Cliente, UUID> {

    Optional<Cliente> findByCpfCnpj(String cpfCnpj);

    Optional<Cliente> findByCodigo(String codigo);

    Page<Cliente> findByStatusCliente(StatusCliente status, Pageable pageable);

    Page<Cliente> findByNomeContainingIgnoreCase(String nome, Pageable pageable);

    Page<Cliente> findByNomeContainingIgnoreCaseAndStatusCliente(String nome, StatusCliente status, Pageable pageable);

    Page<Cliente> findByStatusClienteNot(StatusCliente status, Pageable pageable);

    Page<Cliente> findByNomeContainingIgnoreCaseAndStatusClienteNot(String nome, StatusCliente status, Pageable pageable);

    @Query("""
            SELECT c FROM Cliente c WHERE
            (:filtrarStatus = false OR c.statusCliente = :status)
            AND (:excluirInativo = false OR c.statusCliente <> :inativo)
            AND (
              :termo IS NULL OR
              LOWER(c.nome) LIKE LOWER(CONCAT('%', :termo, '%')) OR
              LOWER(c.codigo) LIKE LOWER(CONCAT('%', :termo, '%')) OR
              (:digitos IS NOT NULL AND c.cpfCnpj LIKE CONCAT('%', :digitos, '%'))
            )
            """)
    Page<Cliente> buscar(
            @Param("status") StatusCliente status,
            @Param("filtrarStatus") boolean filtrarStatus,
            @Param("excluirInativo") boolean excluirInativo,
            @Param("inativo") StatusCliente inativo,
            @Param("termo") String termo,
            @Param("digitos") String digitos,
            Pageable pageable);

    List<Cliente> findTop10ByOrderBySaldoDevedorDesc();
}
