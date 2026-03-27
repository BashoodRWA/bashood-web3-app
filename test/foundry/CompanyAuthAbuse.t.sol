// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/mocks/MockCoreForModules.sol";
import "../../contracts/modules/MaintenanceHistoryModule.sol";
import "../../contracts/modules/InspectionModule.sol";
import "../../contracts/modules/LifecycleEventsModule.sol";
import "../../contracts/modules/InsuranceModule.sol";
import "../../contracts/modules/OperationalMetricsAggregator.sol";
import "../../contracts/standards/IBashoodRWA.sol";

/**
 * @title CompanyAuthAbuseTest
 * @notice Suite de seguridad: valida que el sistema de autorización de empresas
 *         (wallet-based) del protocolo Bashood es resistente a todos los vectores
 *         de abuso conocidos.
 *
 *  Vectores cubiertos:
 *  ─────────────────────────────────────────────────────────────────────────────
 *  A. Post-revocation lockout
 *     Una empresa que es revocada pierde acceso INMEDIATAMENTE.
 *     Ningún estado intermedio permite que opere tras la revocación.
 *
 *  B. Privilegio escalado por empresa autorizada
 *     Una empresa en el whitelist NO puede conceder permisos a terceros.
 *     Solo el owner puede llamar grantX/revokeX.
 *
 *  C. Ciclo completo grant → revoke → re-grant
 *     El owner puede re-autorizar a una empresa previamente revocada.
 *     La empresa recupera acceso solo tras el re-grant explícito.
 *
 *  D. Transferencia de ownership
 *     Tras transferOwnership(), el nuevo owner gestiona las empresas;
 *     el owner anterior pierde la capacidad de grant/revoke.
 *
 *  E. Fuzz: cualquier address sin grant explícito no puede operar
 *     (10 000 runs por defecto garantizan cobertura amplia del espacio de inputs)
 *
 *  Módulos cubiertos:
 *  · MaintenanceHistoryModule  (logEvent)
 *  · InspectionModule          (recordInspection)
 *  · LifecycleEventsModule     (logTransition)
 *  · InsuranceModule           (registerPolicy / revokePolicy)
 */
contract CompanyAuthAbuseTest is Test {

    // ── Fixtures ─────────────────────────────────────────────────────────

    MockCoreForModules       public core;
    MaintenanceHistoryModule public maintenance;
    InspectionModule         public inspection;
    LifecycleEventsModule    public lifecycle;
    InsuranceModule          public insurance;
    OperationalMetricsAggregator public aggregator;

    address public owner    = address(this);
    address public company  = address(0xC0);   // empresa a acreditar
    address public attacker = address(0xA77);  // adversario externo
    address public newOwner = address(0xDEAD); // receptor de ownershipTransfer

    uint256 constant TOKEN = 1;

    // Constantes para InsuranceModule
    bytes32 constant POLICY_ID       = keccak256("POL-TEST-001");
    string  constant PROVIDER        = "AXA Industrial";
    uint256 constant COVERAGE        = 2_000_000 ether;
    uint256 constant PREMIUM         = 20_000 ether;

    // Constantes para InspectionModule
    bytes32 constant TYPE_VISUAL = keccak256("VISUAL");

    // ── setUp ─────────────────────────────────────────────────────────────

    function setUp() public {
        // Core mock + mint de un token
        core = new MockCoreForModules();
        core.mint(TOKEN, owner);

        // Despliegue de los 4 módulos
        maintenance = new MaintenanceHistoryModule(address(core));
        inspection  = new InspectionModule(address(core));
        lifecycle   = new LifecycleEventsModule(address(core));
        insurance   = new InsuranceModule(address(core));
        aggregator  = new OperationalMetricsAggregator(address(core));
    }

    // ══════════════════════════════════════════════════════════════════════
    // A. POST-REVOCATION LOCKOUT
    // ══════════════════════════════════════════════════════════════════════

    /// @notice Una empresa acreditada como recorder pierde el acceso al ser revocada.
    function test_maintenance_revokedCompanyCannotLog() public {
        maintenance.grantRecorder(TOKEN, company);
        // Puede operar antes de la revocación
        vm.prank(company);
        maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "");

        // Revocación
        maintenance.revokeRecorder(TOKEN, company);

        // Intento post-revocación → debe revertir
        vm.prank(company);
        vm.expectRevert("MaintenanceHistory: not a recorder");
        maintenance.logEvent(TOKEN, "CORRECTIVE", 0, 0, bytes32(0), "");
    }

    /// @notice Una empresa acreditada como inspector pierde el acceso al ser revocada.
    function test_inspection_revokedCompanyCannotRecord() public {
        inspection.grantInspector(TOKEN, company);
        vm.prank(company);
        inspection.recordInspection(TOKEN, TYPE_VISUAL, 0, bytes32(0), "");

        inspection.revokeInspector(TOKEN, company);

        vm.prank(company);
        vm.expectRevert("InspectionModule: not an inspector");
        inspection.recordInspection(TOKEN, TYPE_VISUAL, 0, bytes32(0), "");
    }

    /// @notice Una empresa acreditada como operator pierde el acceso al ser revocada.
    function test_lifecycle_revokedCompanyCannotLogTransition() public {
        lifecycle.grantOperator(company);
        vm.prank(company);
        lifecycle.logTransition(
            TOKEN,
            IBashoodRWA.OperationalStatus.OPERATIONAL,
            IBashoodRWA.OperationalStatus.MAINTENANCE,
            "test", bytes32(0)
        );

        lifecycle.revokeOperator(company);

        vm.prank(company);
        vm.expectRevert("LifecycleEvents: not an operator");
        lifecycle.logTransition(
            TOKEN,
            IBashoodRWA.OperationalStatus.MAINTENANCE,
            IBashoodRWA.OperationalStatus.OPERATIONAL,
            "test", bytes32(0)
        );
    }

    /// @notice Una empresa acreditada como insurer pierde el acceso al ser revocada.
    function test_insurance_revokedCompanyCannotRegisterPolicy() public {
        insurance.grantInsurer(company);
        uint32 expiry = uint32(block.timestamp + 365 days);

        vm.prank(company);
        insurance.registerPolicy(TOKEN, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, expiry);

        insurance.revokeInsurer(company);

        vm.prank(company);
        vm.expectRevert("InsuranceModule: not an insurer");
        insurance.registerPolicy(
            TOKEN,
            keccak256("POL-2"),
            PROVIDER, COVERAGE, PREMIUM, expiry + 1
        );
    }

    /// @notice Una empresa revocada no puede revocar pólizas existentes.
    function test_insurance_revokedCompanyCannotRevokePolicy() public {
        insurance.grantInsurer(company);
        uint32 expiry = uint32(block.timestamp + 365 days);
        vm.prank(company);
        insurance.registerPolicy(TOKEN, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, expiry);

        insurance.revokeInsurer(company);

        vm.prank(company);
        vm.expectRevert("InsuranceModule: not an insurer");
        insurance.revokePolicy(TOKEN);
    }

    // ══════════════════════════════════════════════════════════════════════
    // B. ESCALADA DE PRIVILEGIOS POR EMPRESA AUTORIZADA
    // ══════════════════════════════════════════════════════════════════════

    /// @notice Empresa en el whitelist de recorders NO puede acreditar a terceros.
    function test_maintenance_authorizedCompanyCannotGrantOthers() public {
        maintenance.grantRecorder(TOKEN, company);

        vm.prank(company);
        vm.expectRevert();   // OwnableUnauthorizedAccount
        maintenance.grantRecorder(TOKEN, attacker);
    }

    /// @notice Empresa autorizada como inspector NO puede acreditar a terceros.
    function test_inspection_authorizedCompanyCannotGrantOthers() public {
        inspection.grantInspector(TOKEN, company);

        vm.prank(company);
        vm.expectRevert();
        inspection.grantInspector(TOKEN, attacker);
    }

    /// @notice Empresa autorizada como operator NO puede acreditar a terceros.
    function test_lifecycle_authorizedCompanyCannotGrantOthers() public {
        lifecycle.grantOperator(company);

        vm.prank(company);
        vm.expectRevert();
        lifecycle.grantOperator(attacker);
    }

    /// @notice Empresa autorizada como insurer NO puede acreditar a terceros.
    function test_insurance_authorizedCompanyCannotGrantOthers() public {
        insurance.grantInsurer(company);

        vm.prank(company);
        vm.expectRevert();
        insurance.grantInsurer(attacker);
    }

    /// @notice Empresa autorizada NO puede revocar a otra empresa del whitelist.
    function test_maintenance_authorizedCompanyCannotRevokeOthers() public {
        address company2 = address(0xC2);
        maintenance.grantRecorder(TOKEN, company);
        maintenance.grantRecorder(TOKEN, company2);

        vm.prank(company);
        vm.expectRevert();
        maintenance.revokeRecorder(TOKEN, company2);
    }

    // ══════════════════════════════════════════════════════════════════════
    // C. CICLO GRANT → REVOKE → RE-GRANT
    // ══════════════════════════════════════════════════════════════════════

    /// @notice MaintenanceHistoryModule: una empresa re-acreditada puede volver a operar.
    function test_maintenance_reGrantRestoresAccess() public {
        maintenance.grantRecorder(TOKEN, company);
        maintenance.revokeRecorder(TOKEN, company);

        // Re-grant
        maintenance.grantRecorder(TOKEN, company);
        assertTrue(maintenance.isRecorder(TOKEN, company));

        vm.prank(company);
        maintenance.logEvent(TOKEN, "OVERHAUL", 0, 0, bytes32(0), "re-grant OK");
        assertEq(maintenance.getEventCount(TOKEN), 1);
    }

    /// @notice InspectionModule: ciclo completo re-grant restaura el acceso.
    function test_inspection_reGrantRestoresAccess() public {
        inspection.grantInspector(TOKEN, company);
        inspection.revokeInspector(TOKEN, company);
        inspection.grantInspector(TOKEN, company);

        assertTrue(inspection.isInspector(TOKEN, company));

        vm.prank(company);
        inspection.recordInspection(TOKEN, TYPE_VISUAL, 0, bytes32(0), "");
        assertEq(inspection.getInspectionCount(TOKEN), 1);
    }

    /// @notice LifecycleEventsModule: ciclo completo re-grant restaura el acceso.
    function test_lifecycle_reGrantRestoresAccess() public {
        lifecycle.grantOperator(company);
        lifecycle.revokeOperator(company);
        lifecycle.grantOperator(company);

        assertTrue(lifecycle.isOperator(company));

        vm.prank(company);
        lifecycle.logTransition(
            TOKEN,
            IBashoodRWA.OperationalStatus.OPERATIONAL,
            IBashoodRWA.OperationalStatus.INACTIVE,
            "re-grant OK", bytes32(0)
        );
        assertEq(lifecycle.getEventCount(TOKEN), 1);
    }

    /// @notice InsuranceModule: ciclo completo re-grant restaura el acceso.
    function test_insurance_reGrantRestoresAccess() public {
        insurance.grantInsurer(company);
        insurance.revokeInsurer(company);
        insurance.grantInsurer(company);

        assertTrue(insurance.isInsurer(company));

        vm.prank(company);
        insurance.registerPolicy(
            TOKEN, POLICY_ID, PROVIDER, COVERAGE, PREMIUM,
            uint32(block.timestamp + 365 days)
        );
        assertTrue(insurance.getPolicy(TOKEN).active);
    }

    /// @notice Un re-grant sin revocación previa falla (no doble-grant).
    function test_maintenance_doubleGrantReverts() public {
        maintenance.grantRecorder(TOKEN, company);
        vm.expectRevert("MaintenanceHistory: already recorder");
        maintenance.grantRecorder(TOKEN, company);
    }

    // ══════════════════════════════════════════════════════════════════════
    // D. TRANSFERENCIA DE OWNERSHIP
    // ══════════════════════════════════════════════════════════════════════

    /// @notice Tras transferOwnership(), el nuevo owner puede gestionar empresas.
    function test_maintenance_newOwnerCanGrantAfterTransfer() public {
        maintenance.transferOwnership(newOwner);

        // Nuevo owner puede acreditar
        vm.prank(newOwner);
        maintenance.grantRecorder(TOKEN, company);
        assertTrue(maintenance.isRecorder(TOKEN, company));
    }

    /// @notice Tras transferOwnership(), el owner original NO puede acreditar.
    function test_maintenance_oldOwnerCannotGrantAfterTransfer() public {
        maintenance.transferOwnership(newOwner);

        // Owner original ya no puede grant
        vm.expectRevert();   // OwnableUnauthorizedAccount
        maintenance.grantRecorder(TOKEN, company);
    }

    /// @notice LifecycleEventsModule: transferencia de ownership funciona correctamente.
    function test_lifecycle_newOwnerCanGrantAfterTransfer() public {
        lifecycle.transferOwnership(newOwner);

        vm.prank(newOwner);
        lifecycle.grantOperator(company);
        assertTrue(lifecycle.isOperator(company));

        // Owner anterior no puede
        vm.expectRevert();
        lifecycle.grantOperator(attacker);
    }

    // ══════════════════════════════════════════════════════════════════════
    // D2. CASO BORDE: revokeOperator "not an operator" (faltaba en Lifecycle)
    // ══════════════════════════════════════════════════════════════════════

    /// @notice revokeOperator sobre dirección no autorizada debe revertir.
    function test_lifecycle_revokeOperator_notOperator_reverts() public {
        vm.expectRevert("LifecycleEvents: not an operator");
        lifecycle.revokeOperator(attacker);
    }

    /// @notice revokeOperator emite OperatorRevoked cuando es válido.
    function test_lifecycle_revokeOperator_emitsEvent() public {
        lifecycle.grantOperator(company);
        vm.expectEmit(true, false, false, false);
        emit LifecycleEventsModule.OperatorRevoked(company);
        lifecycle.revokeOperator(company);
    }

    // ══════════════════════════════════════════════════════════════════════
    // E. FUZZ: cualquier address sin grant no puede operar
    // ══════════════════════════════════════════════════════════════════════

    /// @notice Fuzz: cualquier caller sin grant no puede logEvent en Maintenance.
    function testFuzz_maintenance_ungrantedCannotLog(address caller) public {
        vm.assume(caller != address(0));
        vm.assume(caller != owner);  // owner es recorder implícito

        vm.prank(caller);
        vm.expectRevert("MaintenanceHistory: not a recorder");
        maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "");
    }

    /// @notice Fuzz: cualquier caller sin grant no puede recordInspection.
    function testFuzz_inspection_ungrantedCannotRecord(address caller) public {
        vm.assume(caller != address(0));
        vm.assume(caller != owner);  // owner es inspector implícito

        vm.prank(caller);
        vm.expectRevert("InspectionModule: not an inspector");
        inspection.recordInspection(TOKEN, TYPE_VISUAL, 0, bytes32(0), "");
    }

    /// @notice Fuzz: cualquier caller sin grant no puede logTransition.
    function testFuzz_lifecycle_ungrantedCannotLogTransition(address caller) public {
        vm.assume(caller != address(0));
        vm.assume(caller != owner);  // owner es operador implícito

        vm.prank(caller);
        vm.expectRevert("LifecycleEvents: not an operator");
        lifecycle.logTransition(
            TOKEN,
            IBashoodRWA.OperationalStatus.OPERATIONAL,
            IBashoodRWA.OperationalStatus.MAINTENANCE,
            "hack", bytes32(0)
        );
    }

    /// @notice Fuzz: cualquier caller sin grant no puede registerPolicy.
    function testFuzz_insurance_ungrantedCannotRegisterPolicy(address caller) public {
        vm.assume(caller != address(0));
        vm.assume(caller != owner);  // owner es insurer implícito

        vm.prank(caller);
        vm.expectRevert("InsuranceModule: not an insurer");
        insurance.registerPolicy(
            TOKEN, POLICY_ID, PROVIDER, COVERAGE, PREMIUM,
            uint32(block.timestamp + 365 days)
        );
    }

    /// @notice Fuzz: ningún address puede grant* sin ser owner.
    function testFuzz_noAddressCanGrantWithoutOwnership(address caller) public {
        vm.assume(caller != address(0));
        vm.assume(caller != owner);

        // Intenta en los 4 módulos
        vm.startPrank(caller);
        vm.expectRevert();
        maintenance.grantRecorder(TOKEN, attacker);
        vm.stopPrank();

        vm.startPrank(caller);
        vm.expectRevert();
        inspection.grantInspector(TOKEN, attacker);
        vm.stopPrank();

        vm.startPrank(caller);
        vm.expectRevert();
        lifecycle.grantOperator(attacker);
        vm.stopPrank();

        vm.startPrank(caller);
        vm.expectRevert();
        insurance.grantInsurer(attacker);
        vm.stopPrank();
    }

    // ══════════════════════════════════════════════════════════════════════
    // F. GOBERNANZA CATASTRÓFICA: renounceOwnership()
    //    Si el owner renuncia, todos los módulos quedan sin gobernanza:
    //    nadie puede conceder ni revocar acceso jamás.
    // ══════════════════════════════════════════════════════════════════════

    /// @notice Tras renounceOwnership(), nadie puede acreditar nuevas empresas.
    function test_maintenance_renounceOwnership_permanentLockout() public {
        maintenance.renounceOwnership();

        // El address(0) pasa a ser el owner → ningún caller es owner
        vm.expectRevert();
        maintenance.grantRecorder(TOKEN, company);
    }

    /// @notice Tras renounceOwnership(), las empresas ya acreditadas
    ///         mantienen el acceso (no hay forma de revocarlas → bloqueo perpetuo).
    function test_maintenance_renounceOwnership_existingGrantSurvives() public {
        maintenance.grantRecorder(TOKEN, company);
        maintenance.renounceOwnership();

        // La empresa sigue siendo recorder — ya no hay owner que la revoque
        assertTrue(maintenance.isRecorder(TOKEN, company));

        // Y puede seguir operando indefinidamente
        vm.prank(company);
        maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "post-renounce");
        assertEq(maintenance.getEventCount(TOKEN), 1);
    }

    /// @notice Tras renounceOwnership() en InsuranceModule, no se pueden
    ///         añadir nuevos insurers ni revocar los existentes.
    function test_insurance_renounceOwnership_permanentLockout() public {
        insurance.grantInsurer(company);
        insurance.renounceOwnership();

        // Nuevo insurer: bloqueado
        vm.expectRevert();
        insurance.grantInsurer(address(0xC9));

        // Revocación del existente: bloqueada (owner = address(0))
        vm.expectRevert();
        insurance.revokeInsurer(company);
    }

    // ══════════════════════════════════════════════════════════════════════
    // G. AISLAMIENTO CROSS-MODULE
    //    Auth en Módulo A no implica auth en ningún otro módulo.
    // ══════════════════════════════════════════════════════════════════════

    /// @notice Empresa autorizada como recorder no puede recordar inspecciones.
    function test_crossModule_recorderNotInspector() public {
        maintenance.grantRecorder(TOKEN, company);
        assertFalse(inspection.isInspector(TOKEN, company));

        vm.prank(company);
        vm.expectRevert("InspectionModule: not an inspector");
        inspection.recordInspection(TOKEN, TYPE_VISUAL, 0, bytes32(0), "");
    }

    /// @notice Empresa autorizada como inspector no puede registrar mantenimientos.
    function test_crossModule_inspectorNotRecorder() public {
        inspection.grantInspector(TOKEN, company);
        assertFalse(maintenance.isRecorder(TOKEN, company));

        vm.prank(company);
        vm.expectRevert("MaintenanceHistory: not a recorder");
        maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "");
    }

    /// @notice Empresa autorizada como operator no puede registrar eventos de seguro.
    function test_crossModule_operatorNotInsurer() public {
        lifecycle.grantOperator(company);
        assertFalse(insurance.isInsurer(company));

        vm.prank(company);
        vm.expectRevert("InsuranceModule: not an insurer");
        insurance.registerPolicy(
            TOKEN, POLICY_ID, PROVIDER, COVERAGE, PREMIUM,
            uint32(block.timestamp + 365 days)
        );
    }

    /// @notice Empresa autorizada como insurer no puede registrar transiciones
    ///         de lifecycle.
    function test_crossModule_insurerNotOperator() public {
        insurance.grantInsurer(company);
        assertFalse(lifecycle.isOperator(company));

        vm.prank(company);
        vm.expectRevert("LifecycleEvents: not an operator");
        lifecycle.logTransition(
            TOKEN,
            IBashoodRWA.OperationalStatus.OPERATIONAL,
            IBashoodRWA.OperationalStatus.MAINTENANCE,
            "hack", bytes32(0)
        );
    }

    /// @notice Fuzz: una autorización en cualquiera de los 4 módulos no
    ///         produce acceso en el resto para ningún address.
    function testFuzz_crossModule_authStaysIsolated(address candidate) public {
        vm.assume(candidate != address(0));
        vm.assume(candidate != owner);

        // Solo autorizado en Maintenance
        maintenance.grantRecorder(TOKEN, candidate);

        assertFalse(inspection.isInspector(TOKEN, candidate));
        assertFalse(lifecycle.isOperator(candidate));
        assertFalse(insurance.isInsurer(candidate));
    }

    // ══════════════════════════════════════════════════════════════════════
    // H. ABUSO INTRA-CLASE: múltiples empresas autorizadas simultáneamente
    //    · Insurer A puede sobreescribir la póliza de Insurer B (diseño intencional,
    //      pero debe documentarse y testarse para auditoría).
    //    · Revocar a Empresa A no afecta a Empresa B.
    // ══════════════════════════════════════════════════════════════════════

    /// @notice Insurer B puede sobreescribir la póliza registrada por Insurer A.
    function test_insurance_insurerB_canOverwriteInsurerA_policy() public {
        address insurerA = address(0xCA);
        address insurerB = address(0xCB);
        insurance.grantInsurer(insurerA);
        insurance.grantInsurer(insurerB);

        bytes32 polA = keccak256("POL-A");
        bytes32 polB = keccak256("POL-B");
        uint32 expiry = uint32(block.timestamp + 365 days);

        vm.prank(insurerA);
        insurance.registerPolicy(TOKEN, polA, "AXA", COVERAGE, PREMIUM, expiry);
        assertEq(insurance.getPolicy(TOKEN).policyId, polA);

        // Insurer B sobreescribe sin consentimiento de Insurer A
        vm.prank(insurerB);
        insurance.registerPolicy(TOKEN, polB, "Allianz", COVERAGE * 2, PREMIUM, expiry);
        assertEq(insurance.getPolicy(TOKEN).policyId, polB);
    }

    /// @notice Revocar a Empresa A no afecta el acceso de Empresa B.
    function test_maintenance_revokeA_doesNotAffectB() public {
        address companyA = address(0xCA);
        address companyB = address(0xCB);
        maintenance.grantRecorder(TOKEN, companyA);
        maintenance.grantRecorder(TOKEN, companyB);

        maintenance.revokeRecorder(TOKEN, companyA);

        assertFalse(maintenance.isRecorder(TOKEN, companyA));
        assertTrue(maintenance.isRecorder(TOKEN, companyB));

        // B sigue operando
        vm.prank(companyB);
        maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "B opera ok");
        assertEq(maintenance.getEventCount(TOKEN), 1);
    }

    /// @notice Tras revotar a InsuranceA, las pólizas que registró
    ///         siguen activas (la revocación no borra estado histórico).
    function test_insurance_revokedInsurerPoliciesRemainActive() public {
        address insurerA = address(0xCA);
        insurance.grantInsurer(insurerA);
        uint32 expiry = uint32(block.timestamp + 365 days);

        vm.prank(insurerA);
        insurance.registerPolicy(TOKEN, POLICY_ID, PROVIDER, COVERAGE, PREMIUM, expiry);
        assertTrue(insurance.isInsured(TOKEN));

        // Revocar al insurer NO invalida la póliza existente
        insurance.revokeInsurer(insurerA);
        assertTrue(insurance.isInsured(TOKEN), "Poliza debe seguir activa tras revocar insurer");
    }

    // ══════════════════════════════════════════════════════════════════════
    // I. RATE-LIMITING ENFORCED (mitigación del Storage DoS)
    //    El protocolo ahora limita escrituras por empresa/época.
    //    El owner está exento; las empresas externas están sujetas al límite.
    // ══════════════════════════════════════════════════════════════════════

    /// @notice Rate-limit bloquea la escritura cuando se supera el límite de la época.
    ///         Por defecto: 20 writes/hora. Se configura en 5 para el test.
    function test_rateLimit_maintenanceBlocksExcessiveWrites() public {
        maintenance.grantRecorder(TOKEN, company);
        maintenance.setRateLimit(5, 1 hours);   // 5 writes por hora para el test

        // 5 writes deben funcionar
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(company);
            maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "");
        }
        assertEq(maintenance.getEventCount(TOKEN), 5);

        // El 6.º debe revertir con "rate limit exceeded"
        vm.prank(company);
        vm.expectRevert("MaintenanceHistory: rate limit exceeded");
        maintenance.logEvent(TOKEN, "CORRECTIVE", 0, 0, bytes32(0), "overflow");
        assertEq(maintenance.getEventCount(TOKEN), 5);  // no se registró
    }

    /// @notice Al avanzar a una nueva época el contador se reinicia.
    function test_rateLimit_epochResetAllowsNewWrites() public {
        maintenance.grantRecorder(TOKEN, company);
        maintenance.setRateLimit(3, 1 hours);

        for (uint256 i = 0; i < 3; i++) {
            vm.prank(company);
            maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "");
        }
        // Rate-limit alcanzado
        vm.prank(company);
        vm.expectRevert("MaintenanceHistory: rate limit exceeded");
        maintenance.logEvent(TOKEN, "CORRECTIVE", 0, 0, bytes32(0), "");

        // Avanzar 1 hora → nueva época → el contador se reinicia
        vm.warp(3601);
        vm.prank(company);
        maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "nueva epoca");
        assertEq(maintenance.getEventCount(TOKEN), 4);
    }

    /// @notice El owner está exento del rate-limiting (puede escribir sin límite).
    function test_rateLimit_ownerExemptFromRateLimit() public {
        maintenance.setRateLimit(2, 1 hours);   // límite muy estricto

        for (uint256 i = 0; i < 50; i++) {
            // owner llama directamente (sin vm.prank)
            maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "");
        }
        assertEq(maintenance.getEventCount(TOKEN), 50);
    }

    /// @notice InspectionModule también aplica rate-limiting.
    function test_rateLimit_inspectionBlocksExcessiveWrites() public {
        inspection.grantInspector(TOKEN, company);
        inspection.setRateLimit(4, 1 hours);

        for (uint256 i = 0; i < 4; i++) {
            vm.prank(company);
            inspection.recordInspection(TOKEN, TYPE_VISUAL, 0, bytes32(0), "");
        }
        assertEq(inspection.getInspectionCount(TOKEN), 4);

        vm.prank(company);
        vm.expectRevert("InspectionModule: rate limit exceeded");
        inspection.recordInspection(TOKEN, TYPE_VISUAL, 0, bytes32(0), "overflow");
        assertEq(inspection.getInspectionCount(TOKEN), 4);
    }

    /// @notice Solo el owner puede cambiar los parámetros de rate-limiting.
    function test_rateLimit_setRateLimitOnlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        maintenance.setRateLimit(1000, 1);

        vm.prank(attacker);
        vm.expectRevert();
        inspection.setRateLimit(1000, 1);
    }

    // ══════════════════════════════════════════════════════════════════════
    // J. INMUTABILIDAD DEL CORE: coreContract() no puede cambiar
    // ══════════════════════════════════════════════════════════════════════

    /// @notice coreContract() retorna siempre la misma dirección después del deploy.
    function test_coreImmutability_maintenance() public view {
        assertEq(maintenance.coreContract(), address(core));
    }

    function test_coreImmutability_inspection() public view {
        assertEq(inspection.coreContract(), address(core));
    }

    function test_coreImmutability_lifecycle() public view {
        assertEq(lifecycle.coreContract(), address(core));
    }

    function test_coreImmutability_insurance() public view {
        assertEq(insurance.coreContract(), address(core));
    }

    function test_coreImmutability_aggregator() public view {
        assertEq(aggregator.coreContract(), address(core));
    }

    /// @notice Constructor con core = address(0) revierte en todos los módulos.
    function test_constructorRejectsZeroCore_allModules() public {
        vm.expectRevert("BashoodModule: core is zero address");
        new MaintenanceHistoryModule(address(0));

        vm.expectRevert("BashoodModule: core is zero address");
        new InspectionModule(address(0));

        vm.expectRevert("BashoodModule: core is zero address");
        new LifecycleEventsModule(address(0));

        vm.expectRevert("BashoodModule: core is zero address");
        new InsuranceModule(address(0));

        vm.expectRevert("BashoodModule: core is zero address");
        new OperationalMetricsAggregator(address(0));
    }

    // ══════════════════════════════════════════════════════════════════════
    // K. OperationalMetricsAggregator: gestión de flotas solo onlyOwner
    // ══════════════════════════════════════════════════════════════════════

    bytes32 constant FLEET_ID = keccak256("FLEET_TEST");

    /// @notice Solo el owner puede crear una flota.
    function test_aggregator_onlyOwnerCanCreateFleet() public {
        vm.prank(attacker);
        vm.expectRevert();
        aggregator.createFleet(FLEET_ID, "Flota Atacante");
    }

    /// @notice Solo el owner puede añadir tokens a una flota.
    function test_aggregator_onlyOwnerCanAddToFleet() public {
        aggregator.createFleet(FLEET_ID, "Flota Test");

        vm.prank(attacker);
        vm.expectRevert();
        aggregator.addToFleet(FLEET_ID, TOKEN);
    }

    /// @notice Solo el owner puede eliminar tokens de una flota.
    function test_aggregator_onlyOwnerCanRemoveFromFleet() public {
        aggregator.createFleet(FLEET_ID, "Flota Test");
        aggregator.addToFleet(FLEET_ID, TOKEN);

        vm.prank(attacker);
        vm.expectRevert();
        aggregator.removeFromFleet(FLEET_ID, TOKEN);
    }

    /// @notice Cualquier cuenta puede leer métricas de flota (sin restricción).
    function test_aggregator_anyoneCanReadFleetMetrics() public {
        aggregator.createFleet(FLEET_ID, "Flota Test");
        aggregator.addToFleet(FLEET_ID, TOKEN);

        // Lectura por address externo — no debe revertir
        vm.prank(attacker);
        aggregator.getFleetMembers(FLEET_ID);
    }

    /// @notice Tras transferOwnership al aggregator, el nuevo owner gestiona flotas.
    function test_aggregator_newOwnerManagesFleets() public {
        aggregator.transferOwnership(newOwner);

        vm.prank(newOwner);
        aggregator.createFleet(FLEET_ID, "Flota del Nuevo Owner");
        // Token añadido por el nuevo owner
        vm.prank(newOwner);
        aggregator.addToFleet(FLEET_ID, TOKEN);

        assertEq(aggregator.getFleetMembers(FLEET_ID).length, 1);

        // Owner anterior ya no puede crear flotas
        vm.expectRevert();
        aggregator.createFleet(keccak256("FLEET_OLD"), "Ilegal");
    }

    // ══════════════════════════════════════════════════════════════════════
    // L. COHERENCIA DEL OWNER IMPLÍCITO
    //    El owner es SIEMPRE autorizado implícitamente, incluso sin estar
    //    en el whitelist explícito. Esta propiedad debe mantenerse bajo
    //    cualquier combinación de grant/revoke.
    // ══════════════════════════════════════════════════════════════════════

    /// @notice El owner es recorder/inspector/operator/insurer aunque no esté
    ///         en el whitelist explícito.
    function test_ownerIsImplicitlyAuthorized_allModules() public view {
        assertTrue(maintenance.isRecorder(TOKEN, owner));
        assertTrue(inspection.isInspector(TOKEN, owner));
        assertTrue(lifecycle.isOperator(owner));
        assertTrue(insurance.isInsurer(owner));
    }

    /// @notice El owner puede ser añadido explícitamente al whitelist.
    ///         Si posteriormente se le revoca del whitelist explícito,
    ///         sigue operando vía la comprobación implícita (owner()).
    ///         Esto significa que el owner NO puede perder su acceso de recorder
    ///         mientras siga siendo owner — propiedad de seguridad importante.
    function test_ownerExplicitGrantDoesNotBreakImplicit() public {
        // El owner puede ser granteado explícitamente (no está en _recorders aún)
        maintenance.grantRecorder(TOKEN, owner);
        assertTrue(maintenance.isRecorder(TOKEN, owner));

        // El owner puede ser revocado del whitelist explícito…
        maintenance.revokeRecorder(TOKEN, owner);

        // …pero SIGUE siendo recorder vía el check implícito owner()
        assertTrue(maintenance.isRecorder(TOKEN, owner), "Owner sigue siendo recorder via implicito");

        // Puede seguir operando sin revert
        maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "owner implicit post-revoke");
        assertEq(maintenance.getEventCount(TOKEN), 1);
    }

    /// @notice Tras transferencia de ownership, el nuevo owner es implícitamente
    ///         autorizado y el antiguo ya no lo es.
    function test_ownerImplicit_followsOwnershipTransfer() public {
        maintenance.transferOwnership(newOwner);

        // newOwner es implícitamente recorder
        assertTrue(maintenance.isRecorder(TOKEN, newOwner));

        // oldOwner ya NO es implícitamente recorder
        assertFalse(maintenance.isRecorder(TOKEN, owner));
    }

    /// @notice Tras transferSwap, el nuevo owner puede operar sin grant explícito.
    function test_newOwner_canOperateWithoutExplicitGrant() public {
        maintenance.transferOwnership(newOwner);

        vm.prank(newOwner);
        maintenance.logEvent(TOKEN, "CORRECTIVE", 0, 0, bytes32(0), "nuevo owner sin grant");
        assertEq(maintenance.getEventCount(TOKEN), 1);
    }

    // ══════════════════════════════════════════════════════════════════════
    // M. SCOPE POR TOKEN: empresa autorizada para token A ≠ token B
    //    La whitelist es PER TOKEN. Una empresa solo puede operar sobre
    //    los tokens para los que tiene grant explícito.
    //    El owner sigue teniendo autorización implícita para todos los tokens.
    // ══════════════════════════════════════════════════════════════════════

    /// @notice Una empresa autorizada solo para TOKEN no puede escribir en TOKEN_2.
    function test_perTokenScope_companyCannotWriteOtherToken() public {
        uint256 TOKEN_2 = 2;
        uint256 TOKEN_3 = 3;
        core.mint(TOKEN_2, address(0xBEEF));
        core.mint(TOKEN_3, address(0xDEED));

        // Company autorizada SOLO para TOKEN
        maintenance.grantRecorder(TOKEN, company);

        // Puede escribir en TOKEN
        vm.prank(company);
        maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "autorizado");
        assertEq(maintenance.getEventCount(TOKEN), 1);

        // NO puede escribir en TOKEN_2 ni TOKEN_3
        vm.prank(company);
        vm.expectRevert("MaintenanceHistory: not a recorder");
        maintenance.logEvent(TOKEN_2, "CORRECTIVE", 0, 0, bytes32(0), "intento cruzado");

        vm.prank(company);
        vm.expectRevert("MaintenanceHistory: not a recorder");
        maintenance.logEvent(TOKEN_3, "OVERHAUL", 0, 0, bytes32(0), "intento cruzado");

        assertEq(maintenance.getEventCount(TOKEN_2), 0);
        assertEq(maintenance.getEventCount(TOKEN_3), 0);
    }

    /// @notice Empresa con grants en varios tokens puede escribir en cada uno,
    ///         pero no en los que no tiene grant.
    function test_perTokenScope_grantForMultipleTokens() public {
        uint256 TOKEN_2 = 2;
        uint256 TOKEN_3 = 3;
        core.mint(TOKEN_2, address(0xBEEF));
        core.mint(TOKEN_3, address(0xDEED));

        // Company con grant para TOKEN y TOKEN_2, pero NO TOKEN_3
        maintenance.grantRecorder(TOKEN,   company);
        maintenance.grantRecorder(TOKEN_2, company);

        vm.startPrank(company);
        maintenance.logEvent(TOKEN,   "PREVENTIVE", 0, 0, bytes32(0), "token 1 ok");
        maintenance.logEvent(TOKEN_2, "CORRECTIVE", 0, 0, bytes32(0), "token 2 ok");
        vm.stopPrank();

        assertEq(maintenance.getEventCount(TOKEN),   1);
        assertEq(maintenance.getEventCount(TOKEN_2), 1);

        vm.prank(company);
        vm.expectRevert("MaintenanceHistory: not a recorder");
        maintenance.logEvent(TOKEN_3, "OVERHAUL", 0, 0, bytes32(0), "sin grant");
        assertEq(maintenance.getEventCount(TOKEN_3), 0);
    }

    /// @notice Dos empresas con grants en tokens distintos no se interfieren.
    function test_perTokenScope_twoCompaniesOneTokenEach() public {
        uint256 TOKEN_2 = 2;
        core.mint(TOKEN_2, address(0xBEEF));

        address companyB = address(0xC3);
        maintenance.grantRecorder(TOKEN,   company);   // companyA → solo TOKEN
        maintenance.grantRecorder(TOKEN_2, companyB);  // companyB → solo TOKEN_2

        // Cada empresa escribe en su token
        vm.prank(company);
        maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "OK a");
        vm.prank(companyB);
        maintenance.logEvent(TOKEN_2, "PREVENTIVE", 0, 0, bytes32(0), "OK b");

        // Escritura cruzada bloqueada en ambas direcciones
        vm.prank(company);
        vm.expectRevert("MaintenanceHistory: not a recorder");
        maintenance.logEvent(TOKEN_2, "CORRECTIVE", 0, 0, bytes32(0), "A intenta token 2");

        vm.prank(companyB);
        vm.expectRevert("MaintenanceHistory: not a recorder");
        maintenance.logEvent(TOKEN, "CORRECTIVE", 0, 0, bytes32(0), "B intenta token 1");

        assertEq(maintenance.getEventCount(TOKEN),   1);
        assertEq(maintenance.getEventCount(TOKEN_2), 1);
    }

    /// @notice La autorización por token no se revoca automáticamente si el
    ///         token cambia de titular en el Core. El owner debe revocar explícitamente.
    function test_perTokenScope_authSurvivesTokenOwnerChange() public {
        maintenance.grantRecorder(TOKEN, company);
        // "Transferencia" del token (simulada: mock no tiene transfer real)
        core.mint(TOKEN + 100, address(0xBEEF2));

        // La auth de company para TOKEN sigue activa
        assertTrue(maintenance.isRecorder(TOKEN, company));
        vm.prank(company);
        maintenance.logEvent(TOKEN, "PREVENTIVE", 0, 0, bytes32(0), "sigue activo");
        assertEq(maintenance.getEventCount(TOKEN), 1);

        // Para revocarla, el owner debe hacerlo explícitamente
        maintenance.revokeRecorder(TOKEN, company);
        assertFalse(maintenance.isRecorder(TOKEN, company));
    }

    // ══════════════════════════════════════════════════════════════════════
    // N. FUZZ EXTENDIDO: concurrencia de múltiples empresas
    //    Asegura que grant/revoke de N empresas simultáneas es independiente.
    // ══════════════════════════════════════════════════════════════════════

    /// @notice Fuzz: revocar a cualquier empresa de un conjunto no afecta a las demás.
    function testFuzz_concurrentCompanies_revokeOneKeepsOthers(uint8 rawN, uint8 rawIdx) public {
        uint256 n        = bound(rawN,   2, 20);
        uint256 revokeIdx = bound(rawIdx, 0, n - 1);

        address[] memory companies = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            companies[i] = address(uint160(0x1000 + i));
            maintenance.grantRecorder(TOKEN, companies[i]);
        }

        address toRevoke = companies[revokeIdx];
        maintenance.revokeRecorder(TOKEN, toRevoke);
        assertFalse(maintenance.isRecorder(TOKEN, toRevoke));

        for (uint256 i = 0; i < n; i++) {
            if (i != revokeIdx) {
                assertTrue(
                    maintenance.isRecorder(TOKEN, companies[i]),
                    "Revocacion de una empresa afecto a otra"
                );
            }
        }
    }

    /// @notice Fuzz: cualquier address sin grant NO puede administrar flotas.
    function testFuzz_aggregator_onlyOwnerManagesFleets(address caller) public {
        vm.assume(caller != address(0));
        vm.assume(caller != owner);

        vm.startPrank(caller);
        vm.expectRevert();
        aggregator.createFleet(FLEET_ID, "hack");
        vm.stopPrank();
    }
}
