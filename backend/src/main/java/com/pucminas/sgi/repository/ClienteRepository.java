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

    @Query("""
            SELECT c FROM Cliente c
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(c.cpfCnpj, '.', ''), '-', ''), '/', ''), ' ', '') = :digitos
            """)
    Optional<Cliente> findByCpfCnpjDigitos(@Param("digitos") String digitos);

    Optional<Cliente> findByCodigo(String codigo);

    Page<Cliente> findByStatusCliente(StatusCliente status, Pageable pageable);

    List<Cliente> findByStatusCliente(StatusCliente status);

    Page<Cliente> findByNomeContainingIgnoreCase(String nome, Pageable pageable);

    Page<Cliente> findByNomeContainingIgnoreCaseAndStatusCliente(String nome, StatusCliente status, Pageable pageable);

    Page<Cliente> findByStatusClienteNot(StatusCliente status, Pageable pageable);

    Page<Cliente> findByNomeContainingIgnoreCaseAndStatusClienteNot(String nome, StatusCliente status, Pageable pageable);

    @Query("""
            SELECT c FROM Cliente c WHERE
            (:filtrarStatus = false OR c.statusCliente = :status)
            AND (:excluirInativo = false OR c.statusCliente <> :inativo)
            AND (
              :termoLike IS NULL OR
              LOWER(c.nome) LIKE :termoLike OR
              LOWER(c.codigo) LIKE :termoLike OR
              (:digitosLike IS NOT NULL AND c.cpfCnpj LIKE :digitosLike)
            )
            """)
    Page<Cliente> buscar(
            @Param("status") StatusCliente status,
            @Param("filtrarStatus") boolean filtrarStatus,
            @Param("excluirInativo") boolean excluirInativo,
            @Param("inativo") StatusCliente inativo,
            @Param("termoLike") String termoLike,
            @Param("digitosLike") String digitosLike,
            Pageable pageable);

    List<Cliente> findTop10ByOrderBySaldoDevedorDesc();
}
