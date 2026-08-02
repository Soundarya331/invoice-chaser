from django.test import TestCase

class UserJWTAuthTestCase(TestCase):
    def test_jwt_registration_and_login(self):
        # 1. Register with Email & Password
        register_payload = {
            'email': 'soundarya.p@example.com',
            'password': 'securepassword123',
            'first_name': 'Soundarya',
            'last_name': 'P',
            'business_name': 'Soundarya Studio'
        }
        reg_response = self.client.post('/api/v1/auth/register/', register_payload, content_type='application/json')
        self.assertEqual(reg_response.status_code, 201)
        reg_data = reg_response.json()
        self.assertIn('tokens', reg_data)
        self.assertIn('access', reg_data['tokens'])
        self.assertIn('refresh', reg_data['tokens'])
        self.assertEqual(reg_data['user']['email'], 'soundarya.p@example.com')

        # 2. Login with Email & Password
        login_payload = {
            'email': 'soundarya.p@example.com',
            'password': 'securepassword123'
        }
        login_response = self.client.post('/api/v1/auth/login/', login_payload, content_type='application/json')
        self.assertEqual(login_response.status_code, 200)
        login_data = login_response.json()
        self.assertIn('tokens', login_data)
        access_token = login_data['tokens']['access']

        # 3. Access Protected Endpoint with JWT Bearer Header
        auth_header = {'HTTP_AUTHORIZATION': f'Bearer {access_token}'}
        profile_response = self.client.get('/api/v1/auth/profile/', **auth_header)
        self.assertEqual(profile_response.status_code, 200)
        profile_data = profile_response.json()
        self.assertEqual(profile_data['email'], 'soundarya.p@example.com')
