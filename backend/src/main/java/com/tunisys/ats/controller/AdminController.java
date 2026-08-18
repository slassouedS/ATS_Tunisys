package com.tunisys.ats.controller;

import com.tunisys.ats.domain.Department;
import com.tunisys.ats.domain.Role;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.UserCreateRequest;
import com.tunisys.ats.repository.AuditLogRepository;
import com.tunisys.ats.repository.DepartmentRepository;
import com.tunisys.ats.repository.RoleRepository;
import com.tunisys.ats.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Endpoints Administrateur : gestion des utilisateurs (RBAC), logs & audit (FN-13, FN-14). */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogRepository auditLogRepository;

    @GetMapping("/users")
    public List<User> listUsers() {
        return userRepository.findAll();
    }

    @PostMapping("/users")
    public User createUser(@Valid @RequestBody UserCreateRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Un utilisateur avec cet email existe déjà");
        }
        Role role = roleRepository.findByCode(request.roleCode())
                .orElseThrow(() -> new IllegalArgumentException("Rôle inconnu : " + request.roleCode()));
        Department department = request.departmentId() != null
                ? departmentRepository.findById(request.departmentId()).orElse(null)
                : null;

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .role(role)
                .department(department)
                .isActive(true)
                .build();
        return userRepository.save(user);
    }

    @PutMapping("/users/{id}/deactivate")
    public User deactivate(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        user.setIsActive(false);
        return userRepository.save(user);
    }

    @GetMapping("/logs")
    public Object logs(@RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "50") int size) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }
}
