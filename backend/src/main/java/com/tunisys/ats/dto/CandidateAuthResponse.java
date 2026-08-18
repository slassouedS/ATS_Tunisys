package com.tunisys.ats.dto;

public record CandidateAuthResponse(
        String accessToken,
        String tokenType,
        String email,
        String firstName,
        String lastName
) {
    public CandidateAuthResponse(String accessToken, String email, String firstName, String lastName) {
        this(accessToken, "Bearer", email, firstName, lastName);
    }
}
