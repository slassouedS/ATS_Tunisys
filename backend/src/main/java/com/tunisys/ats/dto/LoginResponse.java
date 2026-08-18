package com.tunisys.ats.dto;

public record LoginResponse(
        String accessToken,
        String tokenType,
        String email,
        String role,
        String firstName,
        String lastName
) {
    public LoginResponse(String accessToken, String email, String role, String firstName, String lastName) {
        this(accessToken, "Bearer", email, role, firstName, lastName);
    }
}
