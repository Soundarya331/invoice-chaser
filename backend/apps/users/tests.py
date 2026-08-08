from django.test import TestCase
from django.contrib.auth.models import User

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

    def test_admin_reset_user_password(self):
        # Create target normal user
        target_user = User.objects.create_user(username='target_user', email='subscriber@example.com', password='oldpassword123')

        # Create regular non-admin user
        normal_user = User.objects.create_user(username='normal_user', email='regular@example.com', password='password123')

        # Create superadmin user
        superadmin = User.objects.create_superuser(username='superadmin', email='admin@example.com', password='adminpassword123')

        reset_url = '/api/v1/auth/admin/reset-user-password/'

        # 1. Unauthenticated request -> 401
        res1 = self.client.post(reset_url, {'email': 'subscriber@example.com', 'new_password': 'newpassword123'}, content_type='application/json')
        self.assertEqual(res1.status_code, 401)

        # 2. Non-superuser request -> 403
        self.client.force_login(normal_user)
        res2 = self.client.post(reset_url, {'email': 'subscriber@example.com', 'new_password': 'newpassword123'}, content_type='application/json')
        self.assertEqual(res2.status_code, 403)

        # 3. Superadmin request with missing email -> 400
        self.client.force_login(superadmin)
        res3 = self.client.post(reset_url, {'new_password': 'newpassword123'}, content_type='application/json')
        self.assertEqual(res3.status_code, 400)

        # 4. Superadmin request with non-existent email -> 404
        res4 = self.client.post(reset_url, {'email': 'nonexistent@example.com', 'new_password': 'newpassword123'}, content_type='application/json')
        self.assertEqual(res4.status_code, 404)

        # 5. Superadmin request with valid email -> 200 and password updated
        res5 = self.client.post(reset_url, {'email': 'subscriber@example.com', 'new_password': 'newpassword123'}, content_type='application/json')
        self.assertEqual(res5.status_code, 200)

        # Verify target user can log in with new password
        login_res = self.client.post('/api/v1/auth/login/', {'email': 'subscriber@example.com', 'password': 'newpassword123'}, content_type='application/json')
        self.assertEqual(login_res.status_code, 200)
