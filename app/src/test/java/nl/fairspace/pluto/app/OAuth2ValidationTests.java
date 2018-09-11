package nl.fairspace.pluto.app;

import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.github.tomakehurst.wiremock.extension.responsetemplating.ResponseTemplateTransformer;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWT;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.nimbusds.jwt.SignedJWT;
import net.minidev.json.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.cloud.contract.wiremock.AutoConfigureWireMock;
import org.springframework.cloud.contract.wiremock.WireMockConfigurationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.stubFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.hamcrest.Matchers.endsWith;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RunWith(SpringRunner.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWireMock(port = 8531)
@DirtiesContext
public class OAuth2ValidationTests {
	@LocalServerPort
	private int port;

	@Autowired
	private TestRestTemplate restTemplate;

	private RSAPublicKey publicKey;
	private RSAPrivateKey privateKey;
	private String keyId = UUID.randomUUID().toString();
	private SecureRandom random = new SecureRandom();

	@Before
	public void setup() throws NoSuchAlgorithmException {
		storeKeypair();
		JWK jwk = generateKeyset(keyId);
		serveKeyset(jwk);
		serveUserInfo();
		serveEchoToken();
	}

	@Test
	public void applicationIsAccessibleWithAuthenticationHeader() throws Exception {
		ResponseEntity<String> response = getWithKey(new JWTBuilder().signWith(keyId, privateKey).build());

		assertEquals(200, response.getStatusCodeValue());
	}

	@Test
	public void applicationIsNotAccessibleWithUnsignedJWT() throws Exception {
		ResponseEntity<String> response = getWithKey(new JWTBuilder().build());

		assertEquals(401, response.getStatusCodeValue());
	}

	@Test
	public void testAccessTokenWithOtherKeyId() throws JOSEException {
		ResponseEntity<String> response = getWithKey(new JWTBuilder().signWith("test", privateKey).build());
		assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
	}

	@Test
	public void testExpiredSignedAccessToken() throws JOSEException {
		Date expiryDate = new Date(new Date().getTime() - 60 * 1000);
		ResponseEntity<String> response = getWithKey(new JWTBuilder().signWith(keyId, privateKey).expires(expiryDate).build());
		assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
	}

	@Test
	public void applicationProxiesOAuthToken() throws Exception {
		SignedJWT signedJWT = (SignedJWT) new JWTBuilder().signWith(keyId, privateKey).build();
		ResponseEntity<String> response = getWithKey(signedJWT);

		assertEquals(200, response.getStatusCodeValue());
		assertEquals("Bearer " + signedJWT.serialize(), response.getHeaders().get("X-Given-Authorization").get(0));
	}

	@Test
	public void applicationRedirectsWhenHtmlIsAccepted() throws Exception {
		HttpHeaders headers = new HttpHeaders();
		headers.set("Accept", "text/html");
		ResponseEntity<String> response = getWithKey(new JWTBuilder().build(), headers);

		assertEquals(302, response.getStatusCodeValue());
		assertTrue(response.getHeaders().get("Location").get(0).endsWith("/login"));
	}

	@Test
	public void applicationRedirectsWhenHtmlAndJsonIsAccepted() throws Exception {
		HttpHeaders headers = new HttpHeaders();
		headers.set("Accept", "text/html, application/json");
		ResponseEntity<String> response = getWithKey(new JWTBuilder().build(), headers);

		assertEquals(302, response.getStatusCodeValue());
		assertTrue(response.getHeaders().get("Location").get(0).endsWith("/login"));
	}

	@Test
	public void applicationProvides401WithOnlyJsonAccepted() throws Exception {
		HttpHeaders headers = new HttpHeaders();
		headers.set("Accept", "application/json");
		ResponseEntity<String> response = getWithKey(new JWTBuilder().build(), headers);

		assertEquals(401, response.getStatusCodeValue());
	}

	@Test
	public void applicationProvides401WithAjaxHeader() throws Exception {
		HttpHeaders headers = new HttpHeaders();
		headers.set("X-Requested-With", "XMLHttpRequest");
		ResponseEntity<String> response = getWithKey(new JWTBuilder().build(), headers);

		assertEquals(302, response.getStatusCodeValue());
		assertTrue(response.getHeaders().get("Location").get(0).endsWith("/login"));
	}

	@Test
	public void applicationProvidesLoginPathInHeader() throws Exception {
		HttpHeaders headers = new HttpHeaders();
		ResponseEntity<String> response = getWithKey(new JWTBuilder().build(), headers);

		assertEquals(401, response.getStatusCodeValue());
        List<String> loginPathHeader = response.getHeaders().get("X-Login-Path");
		assertNotNull(loginPathHeader);
        assertEquals(1, loginPathHeader.size());
		assertTrue(loginPathHeader.get(0).endsWith("/login"));
	}

	@Test
	public void accessNotAllowedWithoutCorrectAuthority() throws Exception {
        ResponseEntity<String> response = getWithKey(new JWTBuilder().signWith(keyId, privateKey).authorities(Collections.singletonList("other-authority")).build());
        assertEquals(401, response.getStatusCodeValue());
	}

    @Test
	public void accessAllowedWithoutCorrectAuthorityToNoAuthzEndpoint() throws Exception {
        ResponseEntity<String> response = getWithKey(
                new JWTBuilder().signWith(keyId, privateKey).authorities(Collections.singletonList("other-authority")).build(),
                "/noauthz"
        );
        assertEquals(200, response.getStatusCodeValue());
	}

    private ResponseEntity<String> getWithKey(JWT jwt) {
        return getWithKey(jwt, new HttpHeaders(), "/echo-token");
    }

    private ResponseEntity<String> getWithKey(JWT jwt, HttpHeaders headers) {
        return getWithKey(jwt, headers, "/echo-token");
    }

    private ResponseEntity<String> getWithKey(JWT jwt, String path) {
		return getWithKey(jwt, new HttpHeaders(), path);
	}

	private ResponseEntity<String> getWithKey(JWT jwt, HttpHeaders headers, String path) {
		headers.set("Authorization", "Bearer " + jwt.serialize());

		HttpEntity<Object> request = new HttpEntity<>(headers);
		return restTemplate.exchange("http://localhost:" + port + path, HttpMethod.GET, request, String.class);
	}

	private void storeKeypair() throws NoSuchAlgorithmException {
		KeyPair keyPair = generateKeypair();

		// Store keys separately as RSA keys
		publicKey = (RSAPublicKey) keyPair.getPublic();
		privateKey = (RSAPrivateKey) keyPair.getPrivate();
	}

	private KeyPair generateKeypair() throws NoSuchAlgorithmException {
		KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
		generator.initialize(1024, random);
		return generator.generateKeyPair();
	}

	private JWK generateKeyset(String keyId) {
		return new RSAKey.Builder(publicKey)
				.privateKey(privateKey)
				.keyID(keyId)
				.keyUse(KeyUse.SIGNATURE)
				.build();
	}

	private void serveKeyset(JWK jwk) {
		JSONObject jsonKeySet = new JSONObject(Collections.singletonMap("keys", Collections.singletonList(jwk.toJSONObject())));

		// Setup wiremock endpoint to return keyset
		stubFor(get(urlEqualTo("/certs"))
				.willReturn(aResponse().withHeader("Content-Type", "application/json").withBody(jsonKeySet.toJSONString())));
	}

	private void serveEchoToken() {
		// Setup wiremock endpoint to return keyset
		stubFor(get(urlPathEqualTo("/echo-token"))
				.willReturn(
						aResponse()
								.withHeader("X-Given-Authorization", "{{request.headers.Authorization}}")
								.withBody("{}")
								.withTransformers("response-template")));
	}

	private void serveUserInfo() {
		// Setup wiremock endpoint to return keyset
		stubFor(get(urlPathEqualTo("/userinfo"))
				.willReturn(
						aResponse()
								.withHeader("Content-Type", "application/json")
								.withBody("{}")));
	}

	@org.springframework.boot.test.context.TestConfiguration
	public static class WiremockProxyConfig
	{
		@Bean
		WireMockConfigurationCustomizer customizer() {
			return new WireMockConfigurationCustomizer() {
				@Override
				public void customize(WireMockConfiguration config) {
					config.extensions(new ResponseTemplateTransformer(false));
				}
			};
		}
	}
}
