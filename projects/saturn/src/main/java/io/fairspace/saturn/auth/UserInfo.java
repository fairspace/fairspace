package io.fairspace.saturn.auth;

import lombok.Value;

import java.util.Set;

@Value
public class UserInfo {
    String userId;
    String userName;
    String fullName;
    String email;
    Set<String> authorities;
}
